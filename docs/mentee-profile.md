# Profil Mentee

La rubrique « Mon profil » du tableau de bord permet de modifier prénom, nom, téléphone, ville, code pays et présentation. L’email confirmé est affiché en lecture seule. Le sélecteur photo existant est réutilisé : JPG/PNG, 5 Mo maximum, stockage privé et accès limité au propriétaire.

L’action utilise uniquement l’identité de la session. Le service contrôle le compte actif, l’email confirmé, le rôle FOUNDER et l’existence du profil Mentee avant la création du fichier et dans la transaction de sauvegarde. Les champs non autorisés (email, rôle, statut, identifiant d’un autre compte) sont ignorés.

La photo peut être ajoutée, remplacée ou retirée explicitement. Une erreur de chargement de l’aperçu ne demande pas de suppression en base. Un échec de sauvegarde annule les changements de données et nettoie la nouvelle photo. L’ancienne photo n’est supprimée qu’après succès. Changer le téléphone remet sa vérification à zéro.

Les noms et avatars de la navigation sont actualisés après sauvegarde. Les champs utilisent les modèles existants ; aucune migration ni configuration supplémentaire n’est nécessaire. La certification reste masquée et le compte conserve un seul projet.
