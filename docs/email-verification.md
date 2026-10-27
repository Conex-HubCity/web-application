# Vérification email par OTP — Connex

Après inscription ou connexion avec un email non confirmé, la session est limitée à `/verification-email` et à la déconnexion. Les routes gardées redirigent vers cette page, y compris pour les comptes administrateurs existants. La soumission des pièces, la certification, les modifications de profil et les lectures admin sont également contrôlées côté serveur. Aucun ancien compte non vérifié n’est automatiquement confirmé.

Le code possède six chiffres générés aléatoirement, une durée de dix minutes et un usage unique. Le renvoi est limité à un par minute et cinq par fenêtre de quinze minutes. Cinq essais incorrects bloquent la fenêtre, même après un renvoi. Un renvoi remplace le précédent code. L’émission est sérialisée par compte ; le résultat de livraison SMTP est enregistré sans journaliser le code.

La table `email_verifications` conserve une seule demande courante par utilisateur. Elle lie l’email et l’utilisateur au code par une empreinte HMAC-SHA256 avec un secret privé. Les essais et les limites d’envoi restent en base et fonctionnent entre plusieurs instances. Un email modifié, un code expiré, consommé, non envoyé ou une suspension du compte empêchent la confirmation.

Une confirmation valide remplit `users.email_verified_at` et fait passer uniquement `PENDING_VERIFICATION` à `ACTIVE`. Elle ne valide pas le dossier mentor, ses pièces, une certification ou une adhésion. Les anciennes sessions sont supprimées et une nouvelle session est créée dans la même transaction ; la confirmation ne peut pas être réutilisée.

## Configuration SMTP

Renseigner les variables privées de `.env`, également proposées dans `.env.example` :

```dotenv
SMTP_HOST="smtp.votre-domaine.tld"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_REQUIRE_TLS="true"
SMTP_USER="notifications@votre-domaine.tld"
SMTP_PASSWORD="votre-mot-de-passe-smtp"
SMTP_FROM="notifications@votre-domaine.tld"
EMAIL_OTP_SECRET="un-secret-aleatoire-prive-d-au-moins-32-caracteres"
```

Le port 465 utilise `SMTP_SECURE="true"`. Le port 587 utilise STARTTLS requis. Le chiffrement et la validation des certificats sont conservés en production. Ne pas préfixer ces clés par `NEXT_PUBLIC_`. Le secret OTP doit rester identique entre les instances et les redémarrages ; sa rotation invalide les codes en cours. Les valeurs d’exemple et les secrets trop courts sont refusés.

Le secret local est généré sans affichage. Les paramètres SMTP réels doivent être fournis par l’opérateur. Aucun code de test ou d’exception universel n’est exposé, aucun code n’est affiché dans l’interface ou les logs, aucun email n’est simulé comme envoyé en cas d’échec. Le serveur local de capture utilisé par les tests n’est jamais le transport par défaut de l’application.

Si le SMTP est absent ou indisponible, le compte reste créé mais non vérifié ; la page permet de réessayer l’envoi, avec les mêmes limites. Une adresse de test comme `k@k.com` doit être remplacée par une adresse réellement accessible pour recevoir un code réel. Les destinataires sont toujours issus du compte authentifié, jamais d’un champ libre du formulaire OTP.

## Déploiement

Appliquer `npm run db:deploy` pour ajouter la cinquième migration, générer Prisma, puis reconstruire et redémarrer. Les données des comptes existants restent intactes. Les comptes déjà confirmés ne repassent pas par un code à chaque connexion : il s’agit d’une vérification d’adresse, pas d’un second facteur de connexion. La récupération de mot de passe reste un chantier distinct.

## Contrôles réalisés

41 tests réussis, incluant un transport SMTP vers une capture loopback, le refus d’un transport non chiffré en production, l’expiration, les renvois, les limites d’essais, le changement d’adresse et les confirmations concurrentes. Le parcours complet a été vérifié en navigateur avec SMTP de capture : inscription, réception du message, erreur de code, renvoi trop rapide, confirmation et nouvelle session. Les accès mentor/admin étaient bloqués avant confirmation. Le compte temporaire et les messages capturés ont été supprimés. Aucun email réel n’a été envoyé par ces contrôles.
