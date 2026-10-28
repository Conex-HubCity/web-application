# Charte du mentorat de Hubcity

La charte fournie a été reprise intégralement ; seules les dix mentions de WoeLab ont été remplacées par Hubcity. Le fichier source hors dépôt reste intact.

- Lecture publique : `/fr/charte-mentorat` et `/en/charte-mentorat` (texte de référence français).
- Copie Word conservée dans `public/documents/mentor-charter-hubcity-v1.docx`.
- Texte consultable dans `lib/content/mentor-charter.json`.
- Version acceptée : `hubcity-v1-2026-10-28`, définie côté serveur dans `lib/mentor-charter.ts`.

À l’inscription mentor, une case obligatoire non précochée confirme la lecture et l’acceptation. Le serveur exige une valeur strictement vraie et crée le profil avec `charterAcceptedAt` et `charterVersion` dans la même opération que le compte. Cette acceptation n’approuve ni l’email, ni le dossier mentor.

Le dépôt et la resoumission du dossier présentent également le lien vers cette même charte et exigent son acceptation. La date de la première acceptation de cette version est conservée ; une ancienne acceptation sans version est remplacée uniquement lors d’une nouvelle acceptation explicite. La migration ne remplit pas rétroactivement les champs des anciens comptes.

Conserver chaque édition déjà acceptée et son fichier versionné lorsqu’une nouvelle charte est publiée. L’acceptation enregistrée par case à cocher ne constitue pas un fichier signé manuscritement.
