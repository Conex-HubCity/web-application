# Parcours mentor après connexion — V1

L’email doit d’abord être confirmé par OTP sur `/verification-email`. Le serveur charge ensuite le profil à chaque accès à `/compte` et décide de l’orientation :

- Sans candidature soumise : `/mentor/candidature` pour déposer un CV et/ou des justificatifs d’expérience.
- Dossier `PENDING` ou `IN_REVIEW` : `/mentor/validation`, avec la liste des documents transmis et un bouton pour revérifier le statut.
- Candidature `APPROVED`, charte acceptée et au moins une pièce acceptée, contrôlée et non retirée : accès au tableau de bord.
- Dossier `REJECTED` ou `REVOKED` : retour au dépôt pour compléter le dossier. Une candidature sans pièce disponible revient également au dépôt.

Les deux pages mentor vérifient aussi la session, le rôle et l’état en base ; ouvrir leur URL directement ne contourne pas le parcours. Le contrôle est dans `mentorDestination`, utilisé par les trois pages. Le refus ou le retrait d’une preuve essentielle referme l’accès.

## Dépôt et soumission

Le formulaire propose un CV, d’autres justificatifs, une activité et une présentation d’expérience facultatives. Il exige au moins une pièce et l’acceptation des engagements du mentor affichés dans le formulaire. Le CV n’est pas obligatoire lorsqu’un autre justificatif est déposé.

Limites V1 : cinq documents maximum par envoi et 5 Mio au total, PDF, Word (DOC/DOCX) et images JPG/PNG/WebP. Le serveur valide les limites, les types et les signatures de fichiers ; ce contrôle ne remplace pas l’analyse antivirus. L’ensemble des dépôts non retirés est limité à vingt pièces par mentor.

Les fichiers sont écrits sous `uploads/private/mentors/<uuid>`. Le nom d’origine reste une métadonnée et n’est jamais utilisé comme chemin. Les clés de stockage ne sont pas renvoyées au navigateur. Aucun téléchargement public n’est créé.

La soumission inscrit les pièces en `scan_status=PENDING` et `review_status=PENDING`, puis la candidature en `verification_status=PENDING`, avec `submitted_at` et `charter_accepted_at`. Elle conserve le choix de visibilité privé par défaut. Le dépôt ne vérifie pas le contact et n’active ni le compte ni une adhésion. Le mode de simulation des certificats WoeAcademy ne s’applique jamais aux mentors.

Le premier dépôt exige maintenant un email confirmé ; la session limitée créée après inscription ne peut pas le contourner. Les opérations métier existantes continuent d’exiger un compte actif et un contact vérifié. Le tableau de bord après approbation de candidature ne donne pas, à lui seul, accès aux projets : l’adhésion et les autres droits restent contrôlés par les services métier.

Une transaction verrouille le compte pour éviter les doubles soumissions. Un dossier déjà en examen n’est pas déposé une seconde fois. Les fichiers nouvellement écrits sont supprimés si la transaction échoue. Les pièces antérieures restent dans l’historique lors d’une nouvelle soumission après refus.

## Validation administrative

La validation repose sur les opérations existantes du service métier : contrôle technique du fichier par un traitement serveur fiable, décision administrative sur les pièces, puis décision distincte sur la candidature, avec les preuves exactes et la charte. Aucun statut `CLEAN` ou `APPROVED` n’est accepté depuis le formulaire.

L’interface administrative d’examen, le téléchargement privé contrôlé et l’analyse antivirus restent à brancher. Une fois l’approbation enregistrée par le processus administratif, le bouton « Vérifier le statut » ou une nouvelle connexion ouvre le tableau de bord. Aucun délai ni envoi d’email non implémenté n’est promis.

Le schéma Prisma possède déjà les champs nécessaires ; aucune migration supplémentaire n’est requise pour ce parcours.

## Vérifications

Les tests PostgreSQL couvrent la soumission d’un compte en attente, les états de redirection, la confidentialité, la double soumission, l’approbation séparée des pièces et de la candidature, le refus, le retrait, les comptes interdits, les fichiers invalides et le nettoyage des écritures après échec de transaction.

## Tableau de bord mentor

`/compte` affiche désormais une interface dédiée aux mentors validés : vue d’ensemble, projets à découvrir, demandes, accompagnements, profil et adhésion. La navigation est latérale sur ordinateur et comporte quatre entrées principales en bas sur mobile. Les demandes restent accessibles depuis l’accueil et le pied de page ; l’adhésion depuis l’étape mise en avant.

L’accueil présente la prochaine étape d’adhésion pour un nouveau mentor, son parcours et les informations de son dossier. Il n’invente ni projet ni accompagnement ni compteur d’activité. Les demandes et accompagnements affichés sont ceux du compte authentifié, et les projets passent par le service de catalogue existant avec ses contrôles d’accès. Un mentor sans adhésion active n’obtient pas les dossiers réservés.

Les six vues sont navigables. Le profil s’affiche en une colonne et ses justificatifs dans une section dépliable. Le mentor peut modifier son nom, son prénom, son activité, sa biographie, sa localisation, ses expertises, ses langues et sa visibilité ; l’email reste en lecture seule. Les modifications sont validées et autorisées côté serveur. Les justificatifs supplémentaires utilisent le stockage privé et les mêmes limites que la candidature, restent en attente d’examen et ne changent pas l’approbation déjà obtenue ; les clés de stockage et les mots de passe restent sur le serveur. L’adhésion affiche son état réel et, le cas échéant, sa période de validité. Aucun paiement n’est simulé : le paiement et les actions de suivi détaillées constituent les étapes suivantes.

Le rendu et la navigation ont été vérifiés à 1440, 1280, 960, 768, 390 et 320 pixels de largeur avec un compte temporaire supprimé après vérification. Le test de données vérifie les demandes propres au mentor, l’exclusion des champs confidentiels et le blocage du catalogue après expiration de l’adhésion.

## Préversion mentor

`MENTOR_PREVIEW_MODE="true"` limite le parcours public à l’inscription mentor, au dépôt et à la validation. Un mentor approuvé voit une page d’attente d’ouverture, sans tableau de bord ni étape d’adhésion. Les inscriptions, connexions et anciennes sessions porteur sont bloquées dans ce mode. Le backend complet est conservé ; aucune modification du schéma n’est nécessaire. Voir [les modalités de préversion](mentor-preview.md).
