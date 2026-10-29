# Administration minimale — Connex

L’espace `/fr/admin` ou `/en/admin` permet de consulter les candidatures mentors. `/admin/utilisateurs` liste les utilisateurs avec recherche par nom/email, filtres par rôle et état de compte et pagination de vingt lignes. Les candidatures ont leurs propres filtres et leur pagination. Chaque fiche utilisateur et chaque candidature possède une adresse dédiée. Le dossier mentor présente le profil, les pièces, leurs états de revue et de contrôle, et les dernières décisions enregistrées.

La consultation et la revue de candidatures restent en lecture seule : elles ne changent aucune pièce ou statut de candidature. L’admin peut désormais créer et envoyer une invitation privée à un porteur depuis la liste des utilisateurs (voir [les invitations](password-links.md)). Les décisions administratives existantes sont consultables sans être réécrites. Les candidatures sans décision enregistrée sont présentées comme telles. Aucun traitement antivirus ni approbation automatique n’est simulé.

## Accès

Un compte avec email vérifié connecté, non suspendu et non fermé doit avoir le rôle `ADMIN`. Ce rôle est contrôlé côté serveur sur les pages et à nouveau par le service de données à chaque opération. Une modification ou un retrait du rôle prend effet dès la requête suivante. Les comptes mentors ou porteurs ne peuvent pas accéder aux données admin. Le mode `MENTOR_PREVIEW_MODE` conserve l’accès administrateur : `/compte` dirige les administrateurs vers `/admin`, avant le parcours mentor.

L’attribution du rôle se fait uniquement par un opérateur ayant accès à la base, sur un compte déjà inscrit :

```sh
npm run admin:grant -- --email adresse@example.com
```

Cette commande n’active pas le compte, ne vérifie pas son contact et ne change pas son mot de passe. Les comptes suspendus/fermés sont refusés. Aucune inscription administrateur publique et aucun changement de rôle depuis l’interface ne sont ajoutés.

## Justificatifs privés

Les pièces sont téléchargées par une route protégée `/[lang]/admin/documents/[documentId]`, en pièce jointe et sans cache. Le rôle est vérifié avant la lecture du disque. Les références privées doivent correspondre au format `mentors/<uuid>`, et l’empreinte du contenu doit correspondre au fichier stocké. Les pièces retirées ou rejetées par le contrôle technique ne sont pas distribuées. Le téléchargement d’un document en attente ne valide pas son contrôle ni son expertise.

Les pages ne reçoivent jamais les mots de passe, les sessions, les clés de stockage privées ou les empreintes des fichiers. Aucun lien de stockage public n’est créé. Aucun modèle Prisma ou migration supplémentaire n’est nécessaire.

## Vérifications

Les 35 tests couvrent notamment les refus d’accès, le retrait de rôle en cours de session, les filtres, les DTO sans secrets, les chemins de fichiers et l’intégrité des documents. Les listes et fiches FR/EN, la redirection après connexion, les réponses 401/403 des téléchargements et les largeurs 1440, 390 et 320 pixels ont été vérifiées en navigateur sans erreur d’hydratation. Les comptes et pièces temporaires ont été supprimés après contrôle.
