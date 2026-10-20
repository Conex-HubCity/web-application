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

- `/` : accueil avec le hero de la maquette V4 (photo pleine largeur, dégradé vert forêt, titre serif ivoire/doré et médaillon CNX), deux parcours et connexion directement accessibles.
- `/inscription/porteur` : aperçu d’inscription entrepreneur, avant la certification.
- `/inscription/mentor` : aperçu de candidature mentor, vérification avant adhésion.
- `/connexion` : aperçu de connexion avec choix du rôle.
- `/espace` : interface de démonstration conservée, sans authentification réelle.
- `components/splash-screen.tsx` : introduction modale CNX, lettres avec rebond puis « A solution by HubCity ».
- `components/auth-entry.tsx` : formulaires de prévisualisation ; aucune donnée envoyée ou stockée.
- `components/brand.tsx` : signature Conex partagée.
- `components/home-sections.tsx` : cartes des deux parcours, confiance, FAQ native et invitation finale, adaptées de la maquette V4.
- `components/journey.tsx` : étapes du compagnonnage avec sélection porteur/mentor et contenu distinct pour chaque rôle.
- `components/workspace.tsx` : communauté, favoris temporaires et ressources de démonstration.
- `lib/demo-data.ts` : profils et guides illustratifs.
- `app/globals.css` : tokens et styles de l’espace de démonstration.
- `app/welcome.css` : accueil, entrées inscription/connexion, splash et adaptations mobiles.
- `app/home-sections.css` : compositions photo, sections éditoriales, FAQ et adaptations mobiles du bas de page.
- `public/assets/conex/` : huit assets d’origine conservés, sans transformation.
- `references/conference-v4/` : sources archivées ; scripts jamais importés dans l’application.

## Introduction

Séquence d’environ 5,4 secondes : C, N, X apparaissent avec un léger rebond, puis la signature anglaise. Le dialogue natif rend le contenu sous-jacent inactif et conserve la navigation au clavier. Bouton « Passer l’introduction » et touche Échap ; défilement restauré à la fermeture. Une lecture par session via `sessionStorage`, avec possibilité de rejouer depuis le pied de page. Si le stockage est indisponible, la présentation fonctionne sans stockage. Le mode de mouvement réduit retire les animations et raccourcit la présentation à une seconde. Sans JavaScript, le splash reste fermé et les liens de l’accueil restent accessibles.

## Identité et règles de parcours

Palette de référence : vert forêt `#132d26`, ivoire `#f6f3eb`, doré `#f0bf7d`, sauge `#b8c9b7` et accent terre cuite. Polices système sans téléchargement au build. Identité distincte de WoeAcademy. Photos et profils illustratifs ; le logo HubCity fourni reste archivé comme visuel non authentifié, la signature utilise du texte.

Le compte porteur peut précéder la certification ; le profil reste privé avant vérification du certificat WoeAcademy Niveau Rouge. Le pitch demande ensuite une validation distincte. Côté mentor : candidature, vérification, puis adhésion avant activation. La mise en relation demande un contrôle CNX et le consentement des deux parties. Les montants, délais et objectifs indicatifs du cahier des charges ne sont pas des décisions intégrées.

## Limites du prototype

Les formulaires vérifient les champs localement et affichent un retour explicite de démonstration. Ils ne créent ni compte ni session et ne conservent pas les identifiants. Les espaces réels par rôle, certification, stockage privé, paiements, rendez-vous et mentorat nécessitent un backend et des contrôles d’accès. La recherche et les favoris de l’espace de démonstration restent en mémoire. Aucun dossier réel ne doit y être ajouté.
