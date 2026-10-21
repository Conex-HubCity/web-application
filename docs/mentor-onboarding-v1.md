# Parcours mentor après connexion — V1

Le serveur charge le profil à chaque accès à `/compte` et décide de l’orientation :

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

Ce premier dépôt est autorisé pour le compte mentor authentifié encore `PENDING_VERIFICATION`, comme demandé pour l’entrée après inscription. Les opérations métier existantes continuent d’exiger un compte actif et un contact vérifié. Le tableau de bord après approbation de candidature ne donne pas, à lui seul, accès aux projets : l’adhésion et les autres droits restent contrôlés par les services métier.

Une transaction verrouille le compte pour éviter les doubles soumissions. Un dossier déjà en examen n’est pas déposé une seconde fois. Les fichiers nouvellement écrits sont supprimés si la transaction échoue. Les pièces antérieures restent dans l’historique lors d’une nouvelle soumission après refus.

## Validation administrative

La validation repose sur les opérations existantes du service métier : contrôle technique du fichier par un traitement serveur fiable, décision administrative sur les pièces, puis décision distincte sur la candidature, avec les preuves exactes et la charte. Aucun statut `CLEAN` ou `APPROVED` n’est accepté depuis le formulaire.

L’interface administrative d’examen, le téléchargement privé contrôlé et l’analyse antivirus restent à brancher. Une fois l’approbation enregistrée par le processus administratif, le bouton « Vérifier le statut » ou une nouvelle connexion ouvre le tableau de bord. Aucun délai ni envoi d’email non implémenté n’est promis.

Le schéma Prisma possède déjà les champs nécessaires ; aucune migration supplémentaire n’est requise pour ce parcours.

## Vérifications

Les tests PostgreSQL couvrent la soumission d’un compte en attente, les états de redirection, la confidentialité, la double soumission, l’approbation séparée des pièces et de la candidature, le refus, le retrait, les comptes interdits, les fichiers invalides et le nettoyage des écritures après échec de transaction.
