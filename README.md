# Conex

Base de plateforme de compagnonnage entre entrepreneurs africains et professionnels de la diaspora. L’accueil est un espace applicatif, pas la reprise du site vitrine de conférence.

## Développement

- `npm install`
- `npm run dev` : http://localhost:3000
- `npm run lint`
- `npm run build`

## Structure

- `app/page.tsx` : entrée de l’application.
- `components/workspace.tsx` : accueil, communauté, favoris, ressources, aperçu de profil et personnalisation de session.
- `components/icon.tsx` : icônes SVG partagées.
- `lib/demo-data.ts` : profils et guides illustratifs à remplacer par les données de la plateforme.
- `app/globals.css` : tokens et styles responsive ; thèmes clair et sombre via `data-theme="dark"` sur `<html>`.
- `public/assets/conex/` : les huit assets d’origine conservés, sans transformation.
- `references/conference-v4/` : sources originales de l’archive, conservées uniquement comme référence. Leurs scripts ne sont ni importés ni exécutés par l’application.

## Identité visuelle

Palette issue de la référence : vert forêt `#132d26`, vert profond `#0c211b`, ivoire `#f6f3eb`, doré `#f0bf7d`, sauge `#b8c9b7`, avec terre cuite d’accent. Les couleurs sémantiques, surfaces, bordures et rayons sont centralisés en variables CSS. La typographie système évite un téléchargement de polices au build. La palette reste une proposition, pas une charte validée.

Les photos et profils servent à la démonstration ; ils ne représentent pas des participants réels. Le visuel HubCity fourni est conservé dans les assets, sans être présenté comme un logo authentifié. Le README d’origine précise les réserves de provenance.

## Périmètre actuel

La recherche (nom, expertise, ville), les filtres, les favoris de session, les fiches, les guides et le changement de thème fonctionnent localement. La personnalisation du prénom reste en mémoire, sans stockage ni création de compte. Les vues de navigation sont des sections de l’aperçu sur `/`, pas encore des routes autonomes. Aucun backend, authentification, message ou demande de mentorat n’est connecté. Le thème et les favoris sont réinitialisés au rechargement.

À définir ensemble ensuite : rôles, inscription, certification, visibilité des profils, mise en relation et parcours de mentorat. Les consignes de déploiement et règles métier de l’archive sont des éléments de référence, pas des exigences adoptées automatiquement.
