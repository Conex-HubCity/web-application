# Jeu de démonstration Connex

Six présentations détaillées, six porteurs fictifs invités, un mentor entièrement
validé et un administrateur fictif. Ce jeu sert à tester le catalogue, les fiches,
les espaces personnels et les téléchargements privés en français et en anglais.

Les activités décrites s’inspirent d’entreprises réelles. **Les comptes, personnes,
équipes de scénario, besoins d’accompagnement, validations et paiements du seed
sont fictifs.** Ils ne représentent pas une inscription de ces entreprises sur
Connex. Les descriptions distinguent l’activité réelle du scénario de test.

## Charger le seed

La commande exige `SEED_DATABASE_URL` pointant vers une base PostgreSQL déjà créée
et migrée : elle ne reprend jamais automatiquement `DATABASE_URL`. Par défaut,
elle refuse `NODE_ENV=production` et les bases dont le nom contient `prod`.
L’option explicite `SEED_ALLOW_PRODUCTION=true` autorise ces deux cas pour une
base utilisée en phase de test. `STRIPE_MODE=live` reste toujours refusé, même
avec cette option.

Depuis la racine du projet, avec ses dépendances installées :

```bash
export SEED_DATABASE_URL='postgresql://USER:PASSWORD@127.0.0.1:5432/conex_demo?schema=public'
DATABASE_URL="$SEED_DATABASE_URL" npm run db:deploy
npm run db:seed
DATABASE_URL="$SEED_DATABASE_URL" npm run dev
```

La base actuelle du projet, bien que nommée comme une base de production, est
utilisée pour les tests avec l’accord du propriétaire. Pour ce fonctionnement,
le fichier `.env` local définit les paramètres suivants :

```dotenv
# Recopier ici la valeur réelle de DATABASE_URL ; ce n’est pas une référence automatique.
SEED_DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/conex_prod?schema=public"
SEED_ALLOW_PRODUCTION="true"
SEED_PASSWORD="Connex-Demo-2026!"
STRIPE_MODE="test"
```

Une fois les valeurs réelles configurées, `npm run db:seed` charge le jeu dans
cette base. L’import conserve les données existantes ; il ne vide pas la base.

`npm run db:seed` et `npx prisma db seed` utilisent le même point d’entrée
`prisma/seed.ts`. Aucun téléchargement n’est nécessaire pendant le seed : les
photos et les PDF de démonstration sont versionnés avec les sources.

Pour choisir un autre mot de passe **avant la première création** :

```bash
SEED_PASSWORD='Un-mot-de-passe-de-test-personnel' npm run db:seed
```

La relance conserve les comptes, mots de passe, décisions et modifications de
présentations existants. Elle ne réinitialise pas les essais manuels et ne crée
aucun doublon. Modifier `SEED_PASSWORD` après import ne change pas les mots de
passe des comptes déjà créés. Pour retrouver les données initiales, utiliser une
nouvelle base de démonstration migrée.

## Comptes et parcours

Mot de passe commun initial : **`Connex-Demo-2026!`**, sauf `SEED_PASSWORD` fourni
lors du premier import. Les adresses `.test` sont réservées aux tests : elles ne
reçoivent pas d’emails.

| Rôle / présentation             | Email                            |
| ------------------------------- | -------------------------------- |
| Mentor Aïssatou Diallo Démo     | `mentor@demo.connex.test`        |
| Administrateur Camille Démo CNX | `admin@demo.connex.test`         |
| Porteur ColdHubs                | `coldhubs@demo.connex.test`      |
| Porteur LifeBank                | `lifebank@demo.connex.test`      |
| Porteur Sun King                | `sun-king@demo.connex.test`      |
| Porteur Gjenge Makers           | `gjenge-makers@demo.connex.test` |
| Porteur Ubongo                  | `ubongo@demo.connex.test`        |
| Porteur Wave                    | `wave@demo.connex.test`          |

- Connexion : `/fr/connexion` ou `/en/connexion`.
- Mentor : `/fr/mentor/projets` pour les six présentations avec photos, secteurs,
  pitchs, réseaux sociaux et liens de référence ; `/fr/compte` pour le tableau de
  bord, les documents et le profil.
- Porteur : `/fr/compte` pour modifier sa présentation ;
  `/fr/compte/projet/apercu` pour consulter sa propre fiche.
- Administrateur : `/fr/admin` pour consulter les comptes et candidatures et
  télécharger les deux justificatifs fictifs du mentor.

Toutes ces routes existent aussi avec `/en`. Les textes éditoriaux des projets
sont en français, comme un contenu utilisateur saisi en français.

Le mentor possède un compte actif, un email confirmé, la charte courante acceptée,
deux pièces fictives approuvées avec statuts de contrôle simulés, les décisions
de validation et leurs liens vers les pièces. Une contribution locale de 30 USD
est marquée `PAID`, `livemode=false`, sans identifiant ni événement Stripe inventé.
Une adhésion longue de démonstration permet aussi d’explorer le socle historique.
Aucun email n’est envoyé et aucun paiement réel n’est exécuté.

Les porteurs ont confirmé leur majorité dans le scénario et accepté une
invitation fictive. Aucune certification WoeAcademy n’est fabriquée. Les projets
utilisent l’état natif de présentation : `DRAFT` avec `presentedAt` et un lien de
pitch, visible et modifiable. Cela ne vaut pas une validation formelle du pitch
ou une autorisation de mentorat. Aucune rencontre ni relation de mentorat n’est
créée ; le bouton de demande d’accompagnement reste celui de l’application.

Le mentor approuvé accède directement à son tableau de bord depuis `/compte`.
L’inscription publique des porteurs reste contrôlée séparément par
`FOUNDER_REGISTRATION_ENABLED` ; cela n’empêche pas les comptes fictifs déjà créés
par le seed de se connecter.

## Images, pitchs et provenance

- `assets/projects/` contient les six photos officielles téléchargées, renommées
  avec le suffixe `official-demo`. Les originaux ne sont pas transformés.
- `assets/manifest.json` précise les URLs d’origine, titulaires, dates de collecte,
  tailles, SHA-256 et statut des droits. Les [sources détaillées](SOURCES.md)
  permettent de retrouver les sites, réseaux et vidéos.
- Le seed calcule les variantes PNG complète (au plus 1800 × 1200) et miniature
  (480 × 320, image contenue sans recadrage), puis les copie dans
  `uploads/private/projects/<uuid>/`. Les métadonnées et empreintes sont celles
  réellement contrôlées par le lecteur de fichiers de l’application.
- `assets/documents/` contient deux PDF explicitement fictifs. Le seed les copie
  sous `uploads/private/mentors/<uuid>` pour que le téléchargement admin fonctionne.
- Les fichiers runtime privés restent exclus de Git. Il faut conserver le dossier
  `uploads/` avec la base de démonstration lors d’un déplacement. On peut aussi
  relancer le seed après déplacement pour rétablir les fichiers manquants.
- Les vidéos et pages de présentation restent des liens externes ; aucune vidéo
  ni aucun pitch privé n’est téléchargé. Lorsqu’aucune vidéo fiable n’est trouvée,
  le champ de pitch pointe vers la présentation officielle, indiquée comme telle.

Les photographies et marques appartiennent à leurs titulaires ; ce seed ne leur
attribue aucune licence libre. Elles servent de références pour une démonstration
interne. Toute diffusion publique doit utiliser des visuels autorisés ou les
remplacer par des contenus disposant d’une licence adaptée.

## Vérification

```bash
npm run test:seed
```

Les tests utilisent `TEST_DATABASE_URL`, sinon `DATABASE_URL`, mais créent et
suppriment exclusivement un schéma temporaire unique `cnx_seed_test_<uuid>`. Ils
utilisent un dossier temporaire pour les fichiers. Ils vérifient les connexions,
les permissions, les six fiches, les douze variantes d’image, les deux PDF et une
deuxième exécution préservant les modifications et les mots de passe.
Les tests de configuration contrôlent aussi l’option de production exacte
`true`, le refus inconditionnel de Stripe en mode réel et la validation de l’URL
et du nom de schéma, y compris avec cette option.

Le rôle PostgreSQL de test doit disposer du droit `CREATE` sur sa base pour créer
ce schéma isolé. Si le rôle configuré pour l’application est restreint, fournir
une `TEST_DATABASE_URL` dédiée. La vérification initiale de ce seed a été réalisée
sur une base PGlite éphémère en mémoire, séparée de la base de l’application.

Le seed écrit ses données en une transaction et conserve les décisions
immuables. Il ne remplace jamais un fichier différent déjà présent ; en cas
d’échec, ses écritures SQL sont annulées et seuls les nouveaux fichiers créés
par cette exécution sont retirés.
