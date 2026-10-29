# Espace porteur et présentation visible aux mentors

## Parcours et formulaire

Le tableau de bord `/fr/compte` ou `/en/compte` est centré sur la présentation du projet, sa visibilité et ses médias. Le porteur publie une fiche que les mentors validés peuvent consulter immédiatement. Il ne s’agit plus d’un brouillon privé dans l’interface.

Le formulaire comprend le nom du projet, une présentation, le secteur, le stade, les besoins d’accompagnement et un **lien de pitch obligatoire**. Le pitch est un lien HTTP(S) vers une vidéo, un document ou une présentation ; le serveur ne le télécharge pas. Les liens LinkedIn, Facebook et Instagram sont facultatifs. Jusqu’à huit liens supplémentaires peuvent être ajoutés avec un libellé personnel et une URL. Les liens actifs, les données d’identification du projet et le visuel sont repris sur la fiche consultable.

Le bouton « Publier ma présentation » exige les champs obligatoires et rend la fiche visible. Les modifications ultérieures conservent le même projet et la même révision modifiable. Les valeurs restent dans le formulaire après l’enregistrement ou une erreur. Les statuts publics sont « Visible aux mentors » et « Présentation à compléter » ; le vocabulaire de brouillon est retiré de ce parcours.

## Images et modal d’upload

Le modal réutilisable permet la sélection ou le glisser-déposer, un aperçu, une progression et la confirmation de l’image. Il accepte une seule image PNG, JPEG ou WebP de 5 Mio maximum et refuse SVG, animations, fichiers invalides et images dépassant 25 millions de pixels.

Sharp applique l’orientation et réencode deux variantes WebP sans métadonnées d’origine : une image complète contenue dans 1800 × 1200 pixels, sans agrandissement, et une miniature de 480 × 320 pixels avec cadrage `contain`. Le logo n’est pas rogné. Une nouvelle image crée un `ProjectImage` distinct. Les écritures sont annulées et les fichiers nettoyés si l’enregistrement échoue. La limite d’envoi est de vingt images par heure et par porteur.

Les fichiers sont conservés sous `uploads/private/projects/<uuid>/`, jamais dans les assets publics ni dans Git. Les variantes sont servies par `/api/project-images/[imageId]/full` et `/thumbnail`. Le propriétaire actif peut consulter ses images ; un mentor doit être autorisé et l’image rattachée à la présentation courante visible. Les réponses sont privées, sans cache, avec vérification d’intégrité. Le modal peut être réutilisé dans un autre formulaire grâce à son portail, sans formulaire imbriqué.

Une image retirée de la présentation n’est plus accessible aux mentors si aucune présentation courante ne la référence. Les anciennes images privées restent conservées pour préserver les références et versions ; un nettoyage des images non référencées pourra être opéré ultérieurement selon la politique de conservation.

## Accès mentor et accompagnement

Le catalogue `/mentor/projets` et les fiches `/mentor/projets/[projectId]` proposent recherche, filtre par secteur, miniatures, présentation complète, pitch et liens. Ils sont réservés aux mentors actifs, email confirmé, candidature acceptée, charte acceptée, preuve approuvée et contrôlée, contribution unique payée dans le bon environnement. L’ancien modèle `Membership` ne bloque pas la lecture de ces présentations.

Les porteurs voient leur propre fiche, pas celles des autres. Une présentation d’un compte désactivé, non vérifié, d’une révision archivée ou rejetée/retirée n’entre pas dans le catalogue. Les emails, sessions, clés de stockage, certificats et fichiers confidentiels n’y figurent pas.

**Aucune demande d’accompagnement n’est activée.** Le bouton reste désactivé et affiche « En cours de développement ». Les écrans ne créent aucune demande, rencontre ni relation de mentorat.

## Données et garanties

`ProjectRevision` ajoute `pitchUrl`, `socialLinks`, `customLinks`, `brandingImageId` et `presentedAt`. `presentedAt` marque la publication de la présentation. Les contrôles formels existants (`reviewStatus`, `publishedAt`, certification et fichier de pitch contrôlé) restent distincts pour le futur parcours de mentorat : aucune approbation ni analyse de fichier n’est fabriquée pour un lien externe. Les nouveaux champs entrent dans la protection des révisions approuvées.

Le compte porteur doit être actif, son email et sa majorité confirmés ; en préversion, une invitation acceptée reste nécessaire. L’inscription publique reste fermée. Le formulaire ne prend jamais l’identité ou le projet cible depuis le client. Le serveur vérifie aussi que l’image choisie appartient au porteur. Le remplacement d’un projet conserve les règles métier existantes ; cette interface ne crée pas un deuxième projet.

Deux migrations ajoutent les données de présentation, le modèle `ProjectImage` et la protection de l’historique. Prisma et MCD comptent désormais 22 modèles. Les présentations anciennes sans lien de pitch ne sont pas automatiquement exposées : le porteur doit compléter la fiche.
