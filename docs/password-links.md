# Récupération de mot de passe et invitations privées

## Utilisateur

Le lien « Mot de passe oublié ? » ouvre `/fr/mot-de-passe-oublie` ou son équivalent anglais. La réponse reste identique pour une adresse inconnue, un compte désactivé, une limite atteinte ou une indisponibilité SMTP. Le traitement de la demande et l’envoi sont effectués après la réponse avec `after`, pour éviter une différence de temps liée à l’existence du compte. Le serveur doit pouvoir terminer ce travail après la réponse ; ce mécanisme ne remplace pas une file de jobs durable.

Un lien de récupération expire après une heure. La page de définition exige deux mots de passe identiques de 8 à 128 caractères, comme l’inscription. Après succès, toutes les sessions et les demandes OTP antérieures du compte sont supprimées, le lien est consommé et une notification de modification est tentée sans inclure le mot de passe. Une panne de cette notification n’annule pas la modification. La personne se reconnecte normalement : aucun accès automatique n’est créé.

Le lien prouve la maîtrise de l’adresse email associée. Il confirme donc cet email et active uniquement un compte en attente de vérification ; il ne réactive pas un compte suspendu ou fermé et ne valide ni certification ni dossier mentor.

## Invitations

Depuis **Admin → Utilisateurs → Inviter un porteur de projet**, l’administrateur renseigne prénom, nom, email et langue. Le service contrôle à nouveau le rôle admin, l’email confirmé et le compte actif. Il crée exclusivement un rôle `FOUNDER`, sans certification, contribution, projet ni accès administrateur. Le mot de passe initial est aléatoire, haché et n’est communiqué à personne.

Le destinataire reçoit un lien valable 48 heures pour définir lui-même son mot de passe. L’activation demande aussi la prise de connaissance de la politique de confidentialité. Une invitation en attente peut être renvoyée par le même formulaire sans créer un second compte ; une nouvelle émission invalide le lien précédent. Le destinataire peut également demander un nouveau lien depuis « Mot de passe oublié ? » : une invitation non acceptée reste une invitation et conserve la prise de connaissance de la politique de confidentialité.

Un compte existant ordinaire ou une invitation déjà acceptée n’est jamais converti ou modifié par cette fonction. Il peut utiliser le parcours de récupération normal. Un rôle transmis frauduleusement dans le formulaire est ignoré : le rôle est fixé côté serveur.

## Préversion fermée

`FOUNDER_REGISTRATION_ENABLED="false"` ferme uniquement l’inscription publique des porteurs. La page redirige vers l’inscription mentor et le service refuse les soumissions publiques directes. Les comptes porteurs existants peuvent se connecter et récupérer leur mot de passe ; les invitations privées restent disponibles. L’ouverture publique exige explicitement `FOUNDER_REGISTRATION_ENABLED="true"`. Le mode de préversion mentor est supprimé et n’intervient plus dans la connexion ni les sessions.

Les porteurs invités arrivent désormais dans l’espace porteur pour publier la présentation de leur projet. La présentation devient visible aux mentors une fois complétée ; la certification et l’accompagnement gardent leurs contrôles distincts. Les accès mentors et admin existants restent distincts. En mode complet, les porteurs invités retrouvent le parcours existant avec ses contrôles de certification ; une invitation ne certifie personne.

## Stockage et déploiement

Deux modèles portent ce parcours : `PasswordToken` et `AccountInvitation` (21 modèles au total). Le token comporte 32 octets aléatoires ; seule son empreinte SHA-256 est conservée, avec email, finalité, expiration, état d’envoi et consommation. Le lien est inutilisable avant confirmation d’envoi SMTP, après changement d’email, nouvelle émission, expiration, consommation ou désactivation du compte.

Le token est placé dans le fragment `#token=…` du lien, lu côté client puis transmis à une Server Action. Il n’est jamais ajouté à une URL de requête HTTP, aux logs applicatifs, à une page admin ou à un lien de stockage. La journalisation Next.js des arguments des Server Functions est désactivée, y compris en développement. Les pages de récupération utilisent `noindex` et `no-referrer`. Le fragment est supprimé du navigateur après succès. La langue peut être changée avant l’utilisation du lien.

Les émissions sont limitées de façon persistante à cinq par adresse sur quinze minutes ; les invitations sont également limitées à vingt par administrateur sur cette période. La protection générale par IP doit être assurée à l’entrée de l’hébergement, avec une source IP fiable. Aucun mot de passe, token complet ou erreur SMTP détaillée n’est journalisé.

Les emails utilisent le SMTP déjà configuré et l’origine canonique `APP_URL`, partagée avec Stripe. HTTPS est obligatoire hors développement local. Ne jamais construire ce lien depuis un en-tête Host fourni par la requête.

Appliquer `npm run db:deploy`, puis générer Prisma et reconstruire/redémarrer. Aucun email réel n’est envoyé par les tests automatisés : ils utilisent une capture SMTP locale ou une fonction d’envoi isolée.

## Changer l’ouverture des inscriptions

`FOUNDER_REGISTRATION_ENABLED` est lue au moment de la requête pour l’accueil, la connexion et les inscriptions, puis contrôlée à nouveau par le serveur lors de la création du compte. La valeur n’est plus figée dans le prérendu du build. Seule la chaîne `true` ouvre l’inscription ; `false`, une valeur absente ou invalide la ferment.

Après modification du fichier `.env` ou de l’environnement du service, redémarrer le processus Node (avec rechargement de son environnement si le gestionnaire de processus le requiert), puis recharger la page. Un nouveau build n’est plus nécessaire pour ce seul réglage. Les variables injectées par le service ou les fichiers d’environnement prioritaires peuvent remplacer la valeur de `.env`. Ce réglage ne désactive pas la connexion des comptes existants ni les invitations.

Vérification de régression : après un build, `npm run test:registration` lance des serveurs temporaires avec les deux valeurs et vérifie les bandeaux, liens et formulaires FR/EN sur le même artefact compilé. Aucun compte ni email n’est créé.

## Présentation des liens par email

Les liens de réinitialisation et d’invitation disposent d’une version HTML CNX et de la version texte existante. L’email utilise un bouton doré, une URL de secours copiable, l’expiration et les consignes d’ignorance d’une demande non sollicitée. Le jeton reste dans le fragment du lien, avec les mêmes durées : une heure pour une réinitialisation et 48 heures pour une invitation.

Le logo utilise l’origine canonique du lien, issue de `APP_URL`. Le transport SMTP garde ses contrôles TLS, ses limites et la désactivation des accès fichiers/URL de Nodemailer. Aucun paramètre SMTP ni secret n’est ajouté aux templates. Les aperçus locaux sans envoi sont générés par `node --import tsx scripts/preview-emails.ts` dans `exports/mail-previews`.
