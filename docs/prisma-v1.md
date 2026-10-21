# Conex — backend et Prisma V1

Le [schéma Prisma](../prisma/schema.prisma) traduit le [MCD](mcd-v1.md). Les migrations, les services métier et [l’inscription/connexion V1](authentication-v1.md) sont implémentés. Les interfaces des parcours métier restent à brancher.

## Base et migrations

La base locale dédiée est `conex`. La commande `npm run db:setup` peut la préparer lorsque `.env` vise encore la base technique locale `postgres` : elle conserve les identifiants, crée une base dédiée si nécessaire et met à jour uniquement l’URL locale. Elle refuse de réinitialiser une base existante non identifiée comme Conex.

Les migrations sont versionnées dans `prisma/migrations/` :

- `20261020000100_initial_v1` : 14 tables métier, clés, index, contraintes de cohérence et premières protections de l’historique.
- `20261020000200_protect_history` : protection du contenu des certificats, du propriétaire des projets, des suivis approuvés et du rattachement des mentorats.
- `20261020000300_auth_sessions` : sessions persistantes et limitation des tentatives d’authentification, soit deux tables supplémentaires.
- `20261020000400_test_certification_marker` : origine immuable des justificatifs approuvés en simulation locale ; voir le [parcours de certification](certification-v1.md).

`prisma/constraints-v1.sql` est la source des contraintes complémentaires incluses dans la migration initiale. Ne pas exécuter ce fichier séparément ni modifier une migration déjà appliquée.

Les noms de modèles et de champs sont en anglais. Les tables et colonnes PostgreSQL utilisent snake_case via `@map` et `@@map`. Les identifiants sont des UUID et les instants sont stockés en `timestamptz(3)`.

## Contraintes appliquées par PostgreSQL

- Un email ou téléphone non vide est nécessaire ; l’email est normalisé en minuscules et unique.
- Chaque profil partage la clé `user_id` du compte ; un fondateur possède au maximum un dossier projet.
- La version courante appartient obligatoirement au même projet grâce à une clé étrangère composite.
- Une décision de validation vise exactement une cible ; refus, correction et révocation exigent un motif.
- Les décisions et leurs liens de preuve sont non modifiables et non supprimables.
- Les métadonnées et le contenu référencé des justificatifs ne peuvent pas être réécrits pour changer une preuve déjà examinée.
- Tailles positives, sommes de contrôle SHA-256 et états de contrôle des fichiers sont vérifiés.
- Une pièce acceptée est contrôlée et non retirée ; une soumission exige un pitch contrôlé.
- Les versions de projet approuvées conservent leur contenu ; le propriétaire du dossier ne peut pas être changé.
- Les dates d’adhésion, consentements et clôtures doivent être cohérentes.
- Un suivi approuvé possède une date et un examinateur et ne peut plus être réécrit.
- Une demande ne peut pas être rattachée à un autre projet ou mentor ; l’auto-mentorat est refusé.

Les contraintes SQL complètent les autorisations du service ; elles ne remplacent pas l’identité issue d’une session vérifiée.

## Services métier

Entrée : `createPlatformService()` dans `lib/domain/platform-service.ts`. Le client `getDb()` reste réservé au serveur.

Les opérations relisent le compte, les rôles et les droits en base. Les écritures métier utilisent des transactions sérialisables avec reprise bornée des conflits. Activation d’un mentorat, enregistrement d’un suivi et remplacement de projet verrouillent le même dossier projet.

| Domaine      | Opérations implémentées                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Compte       | Contexte minimal avec rôles et états, sans mot de passe ni justificatifs                                                       |
| Mentor       | Choix de visibilité, catalogue visible sous conditions, dépôt de métadonnées privées, retrait de pièce                         |
| Documents    | Autorisation distincte des CV, certificats et pitchs ; contrôle des droits avant remise d’une référence de stockage au serveur |
| Projet       | Création unique, modification du brouillon, soumission, décision administrative, publication et catalogue filtré               |
| Validation   | Certificat, pièce mentor, candidature mentor et pitch examinés séparément ; preuves exactes rattachées à la décision mentor    |
| Rencontre    | Demande, accord CNX, rencontre réalisée, consentement ou refus des participants, activation administrative                     |
| Suivi        | Compte rendu par un participant, approbation administrative, clôture documentée du compagnonnage                               |
| Remplacement | Délai, absence de mentorat ouvert, nouvelle version brouillon, archivage et conservation de l’historique                       |

Un mentor privé peut explorer les projets s’il est vérifié et adhérent. Une préférence publique ne publie jamais son CV. La visibilité effective nécessite un compte actif, un contact vérifié, une candidature acceptée, la charte et une adhésion dans sa période de validité.

Les catalogues ne renvoient pas de clés de stockage, certificats ou coordonnées privées. Le service d’accès aux documents retourne une référence destinée exclusivement au serveur : la future route de téléchargement devra vérifier la session, appeler ce service puis produire un lien temporaire ou transmettre le fichier. Aucun stockage public ou lien permanent n’est créé.

Le retrait d’un justificatif utilisé dans la dernière approbation mentor remet le profil en attente de réexamen et retire ses accès réservés. Les pièces et décisions précédentes restent conservées.

Les objets de formulaire sont projetés sur une liste de champs autorisés : ils ne peuvent pas injecter un statut de validation, une date de publication ou un résultat antivirus.

## Règle de remplacement confirmée

Le remplacement exige simultanément :

1. Aucun mentorat actif ; une pause continue de bloquer jusqu’à une clôture documentée.
2. Au moins **30 jours écoulés**, calculés en UTC, sans suivi.

Le point de départ est le plus récent entre la première soumission de la version courante, le dernier rendez-vous introductif réalisé et le dernier compte rendu de rencontre ou bilan approuvé. Un message, un brouillon ou un bilan non approuvé ne suffit pas.

Le nouveau projet démarre en brouillon et doit repasser par la validation du pitch. Les anciennes demandes restent dans l’historique et ne peuvent pas être activées sur une version archivée. Une correction de brouillon ou demandée par l’équipe n’est pas traitée comme un remplacement de projet publié.

## Préparation de l’authentification

La connexion ne propose plus de sélection mentor/fondateur. La couche d’authentification vérifie les identifiants et lit les rôles stockés en base. La page `/compte` affiche ce contexte, sans accepter de rôle fourni à la connexion par le navigateur.

La réponse contient `roles`, `accountStatus`, `contactVerified` et les indications de profil utiles à l’orientation. Les permissions continuent d’être vérifiées côté serveur sur chaque action. Un rôle conservé dans le navigateur ne donne aucun droit.

L’inscription et la connexion utilisent des Server Actions et des sessions persistantes. Les comptes créés restent `PENDING_VERIFICATION` : ils peuvent s’authentifier mais les services métier exigent toujours leur activation et la vérification du contact. `actorId` dans ces services doit provenir d’une session vérifiée : ne jamais le récupérer directement dans un corps de requête client. Le choix de parcours reste pertinent à l’inscription, pas à la connexion.

Le modèle permet plusieurs rôles par compte ; la règle de cumul et l’écran d’orientation des comptes multirôles restent à décider pour l’authentification. Aucun administrateur n’est créé automatiquement.

## Tests et commandes

```bash
npm run db:setup
npm run db:deploy
npm run db:validate
npm run db:generate
npm test
npm run lint
npm run build
```

Les tests appliquent les migrations à un schéma PostgreSQL temporaire `conex_test_<uuid>`, puis le suppriment. Ils ne modifient jamais les tables applicatives existantes. Ils utilisent `TEST_DATABASE_URL` si renseignée, sinon `DATABASE_URL`. Le compte de test doit avoir le droit de créer un schéma.

Sans URL configurée, les tests PostgreSQL sont explicitement ignorés ; les règles de date et l’application des migrations sur PostgreSQL embarqué restent testées. Vérifier le nombre de tests exécutés avant toute livraison. En local, la suite complète compte 21 tests.

## Intégrations suivantes

L’authentification et le dépôt privé des certificats WoeAcademy sont branchés. Le [dépôt des pièces mentor et la page d’attente](mentor-onboarding-v1.md) sont également branchés. La vérification email/téléphone, l’interface administrative de validation et l’analyse antivirus restent à réaliser. Les méthodes de fichiers attendent des métadonnées produites par un traitement serveur fiable, jamais un résultat antivirus déclaré par le client. Les limites de fichiers et référentiels de secteurs/langues restent à fixer.

Paiements et reçus, calendrier détaillé, notifications, signalements et journal d’audit global sont les modules suivants. `Membership` est contrôlé pour autoriser les accès mais aucun paiement réel n’est simulé ou confirmé automatiquement.
