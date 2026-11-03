# Fin du mode de préversion mentor

Le mode de préversion et sa variable d’environnement ont été supprimés : le tableau de bord mentor est implémenté. Les anciens écrans d’attente d’ouverture et les restrictions associées sur la connexion, la certification, l’édition de profil et l’ajout de justificatifs sont retirés.

Le parcours mentor conserve ses contrôles serveur : email confirmé, contribution unique réellement payée dans le bon environnement, charte acceptée, dossier approuvé et justificatif accepté, contrôlé et non retiré. Sans dossier validé, le parcours reste orienté vers le dépôt ou l’attente de validation. Aucune adhésion supplémentaire n’est demandée. Les demandes d’accompagnement restent désactivées.

`FOUNDER_REGISTRATION_ENABLED="false"` ferme uniquement l’inscription publique des porteurs, indépendamment de l’accès des comptes existants et invités. Passer cette variable à `true` ouvre l’inscription publique après redémarrage du serveur et rechargement de la page ; cette valeur est lue à la requête, sans reconstruction nécessaire. Le catalogue et les fiches mentor restent réservés aux mentors autorisés ; l’aperçu propriétaire conserve sa route séparée.

Aucune migration n’est nécessaire. Retirer l’ancienne variable des environnements de déploiement ; si elle reste définie sur un serveur, elle n’est plus lue. Reconstruire puis redémarrer l’application.
