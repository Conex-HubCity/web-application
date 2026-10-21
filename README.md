# Conex

Base de plateforme de compagnonnage entre entrepreneurs africains et professionnels de la diaspora.

## Conception des données

Le [MCD V1 et ses règles métier](docs/mcd-v1.md) décrit les comptes, les profils
mentor/porteur, la visibilité et le projet courant avec historique. Les points à
confirmer y sont identifiés ; la traduction Prisma et les premières migrations
sont désormais disponibles.

Le [backend Prisma V1](docs/prisma-v1.md) décrit les migrations, les contraintes,
les services métier et les tests. La base locale dédiée `conex` est préparée ;
l’authentification sera branchée ensuite.

## Développement

- `npm install`
- `npm run dev` : http://localhost:3000
- `npm run lint`
- `npm test` : règles métier et migrations sur un schéma temporaire isolé.
- `npm run db:deploy` : appliquer les migrations versionnées sur la base configurée.
- `npm run build`

## Écrans et structure

Un aperçu autonome HTML/CSS/JS de l’accueil est disponible dans `exports/conex-preview/`, sans inscription ni connexion, avec un modal « Version en développement — Ne pas publier ». Ouvrir son `index.html`. Pour le régénérer depuis l’application démarrée : `npm run export:preview -- http://localhost:3000/` (Node.js et Python requis pour l’export seulement).

- `/` : accueil avec le hero de la maquette V4 (photo pleine largeur, dégradé vert forêt, titre serif ivoire/doré et médaillon CNX), deux parcours et connexion directement accessibles.
- `/inscription/porteur` : création d’un compte porteur de projet, avant la certification.
- `/inscription/mentor` : création d’un compte mentor avec profil privé.
- `/connexion` : connexion par email et mot de passe, rôle reconnu depuis la base.
- `/compte` : panel protégé par session et contrôle serveur de la certification pour les porteurs de projet.
- `/mentor/candidature` : dépôt privé du CV et des justificatifs d’expérience.
- `/mentor/validation` : candidature en cours de validation ; voir le [parcours mentor](docs/mentor-onboarding-v1.md).
- `/certification` : dépôt privé du justificatif WoeAcademy ; [validation automatique en test local](docs/certification-v1.md).
- `/espace` : interface de démonstration conservée, sans authentification réelle.
- `components/splash-screen.tsx` : introduction modale CNX, lettres avec rebond puis « A solution by HubCity ».
- `components/auth-entry.tsx` : formulaires reliés aux Server Actions et à PostgreSQL.
- `lib/auth/` : mots de passe hachés, sessions et limitation des tentatives ; voir [l’authentification V1](docs/authentication-v1.md).
- `components/brand.tsx` : signature Conex partagée.
- `components/home-sections.tsx` : cartes des deux parcours, confiance, FAQ native et invitation finale, adaptées de la maquette V4.
- `components/journey.tsx` : étapes du compagnonnage avec sélection porteur/mentor et contenu distinct pour chaque rôle.
- `components/workspace.tsx` : communauté, favoris temporaires et ressources de démonstration.
- `lib/demo-data.ts` : profils et guides illustratifs.
- `app/globals.css` : tokens et styles de l’espace de démonstration.
- `app/welcome.css` : accueil, entrées inscription/connexion, splash et adaptations mobiles.
- `app/home-sections.css` : compositions photo, sections éditoriales, FAQ et adaptations mobiles du bas de page.
- `public/assets/conex/` : huit assets d’origine conservés, sans transformation.
- `uploads/private/certifications/` : justificatifs confidentiels ; `uploads/private/mentors/` conserve les pièces mentor et `uploads/public/` est réservé aux futurs fichiers partageables. Les fichiers déposés sont exclus de Git.
- `references/conference-v4/` : sources archivées ; scripts jamais importés dans l’application.

## Introduction

Séquence d’environ 5,4 secondes : C, N, X apparaissent avec un léger rebond, puis la signature anglaise. Le dialogue natif rend le contenu sous-jacent inactif et conserve la navigation au clavier. Bouton « Passer l’introduction » et touche Échap ; défilement restauré à la fermeture. Une lecture par session via `sessionStorage`, avec possibilité de rejouer depuis le pied de page. Si le stockage est indisponible, la présentation fonctionne sans stockage. Le mode de mouvement réduit retire les animations et raccourcit la présentation à une seconde. Sans JavaScript, le splash reste fermé et les liens de l’accueil restent accessibles.

## Identité et règles de parcours

Palette de référence : vert forêt `#132d26`, ivoire `#f6f3eb`, doré `#f0bf7d`, sauge `#b8c9b7` et accent terre cuite. Polices système sans téléchargement au build. Identité distincte de WoeAcademy. Photos et profils illustratifs ; la signature du splash affiche « A solution by » puis le logo HubCity fourni dans les assets.

Le compte porteur peut précéder la certification ; le profil reste privé avant vérification du certificat WoeAcademy Niveau Rouge. Le pitch demande ensuite une validation distincte. Côté mentor : candidature, vérification, puis adhésion avant activation. La mise en relation demande un contrôle CNX et le consentement des deux parties. Les montants, délais et objectifs indicatifs du cahier des charges ne sont pas des décisions intégrées.

## Limites du prototype

L’inscription et la connexion créent maintenant de vrais comptes et sessions. Les nouveaux comptes restent en attente de vérification ; l’envoi des emails, la vérification du contact et la récupération de mot de passe restent à réaliser. La certification, le stockage privé, les paiements, les rendez-vous et le mentorat disposent d’un socle métier mais attendent leurs interfaces et intégrations. La recherche et les favoris de `/espace` restent une démonstration en mémoire, distincte de `/compte`.
