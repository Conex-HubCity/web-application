# Récupération de mot de passe et invitations privées

## Utilisateur

Le lien « Mot de passe oublié ? » ouvre `/fr/mot-de-passe-oublie` ou son équivalent anglais. La réponse reste identique pour une adresse inconnue, un compte désactivé, une limite atteinte ou une indisponibilité SMTP. Le traitement de la demande et l’envoi sont effectués après la réponse avec `after`, pour éviter une différence de temps liée à l’existence du compte. Le serveur doit pouvoir terminer ce travail après la réponse ; ce mécanisme ne remplace pas une file de jobs durable.

Un lien de récupération expire après une heure. La page de définition exige deux mots de passe identiques de 8 à 128 caractères, comme l’inscription. Après succès, toutes les sessions et les demandes OTP antérieures du compte sont supprimées, le lien est consommé et une notification de modification est tentée sans inclure le mot de passe. Une panne de cette notification n’annule pas la modification. La personne se reconnecte normalement : aucun accès automatique n’est créé.

Le lien prouve la maîtrise de l’adresse email associée. Il confirme donc cet email et active uniquement un compte en attente de vérification ; il ne réactive pas un compte suspendu ou fermé et ne valide ni certification ni dossier mentor.

## Invitations

Depuis **Admin → Utilisateurs → Inviter un porteur de projet**, l’administrateur renseigne prénom, nom, email et langue. Le service contrôle à nouveau le rôle admin, l’email confirmé et le compte actif. Il crée exclusivement un rôle `FOUNDER`, sans certification, contribution, projet ni accès administrateur. Le mot de passe initial est aléatoire, haché et n’est communiqué à personne.

Le destinataire reçoit un lien valable 48 heures pour définir lui-même son mot de passe. L’activation demande aussi sa confirmation de majorité. Une invitation en attente peut être renvoyée par le même formulaire sans créer un second compte ; une nouvelle émission invalide le lien précédent. Le destinataire peut également demander un nouveau lien depuis « Mot de passe oublié ? » : une invitation non acceptée reste une invitation et conserve l’exigence de majorité.

Un compte existant ordinaire ou une invitation déjà acceptée n’est jamais converti ou modifié par cette fonction. Il peut utiliser le parcours de récupération normal. Un rôle transmis frauduleusement dans le formulaire est ignoré : le rôle est fixé côté serveur.

## Préversion fermée

`FOUNDER_REGISTRATION_ENABLED="false"` ferme l’inscription publique des porteurs, même si `MENTOR_PREVIEW_MODE` est désactivé pour travailler sur le mode complet. La page d’inscription porteur redirige vers celle des mentors ; le service refuse également les soumissions directes. L’ouverture publique ultérieure exige explicitement `FOUNDER_REGISTRATION_ENABLED="true"` et un mode mentor non limité. Seuls les porteurs disposant d’une invitation enregistrée **et acceptée** peuvent se connecter en préversion. Une récupération de mot de passe d’un porteur ordinaire ne crée pas cette exception. Le contrôle est refait à chaque lecture de session.

Les porteurs invités arrivent désormais dans l’espace porteur pour publier la présentation de leur projet. La présentation devient visible aux mentors une fois complétée ; la certification et l’accompagnement gardent leurs contrôles distincts. Les accès mentors et admin existants restent distincts. En mode complet, les porteurs invités retrouvent le parcours existant avec ses contrôles de certification ; une invitation ne certifie personne.

## Stockage et déploiement

Deux modèles portent ce parcours : `PasswordToken` et `AccountInvitation` (21 modèles au total). Le token comporte 32 octets aléatoires ; seule son empreinte SHA-256 est conservée, avec email, finalité, expiration, état d’envoi et consommation. Le lien est inutilisable avant confirmation d’envoi SMTP, après changement d’email, nouvelle émission, expiration, consommation ou désactivation du compte.

Le token est placé dans le fragment `#token=…` du lien, lu côté client puis transmis à une Server Action. Il n’est jamais ajouté à une URL de requête HTTP, aux logs applicatifs, à une page admin ou à un lien de stockage. La journalisation Next.js des arguments des Server Functions est désactivée, y compris en développement. Les pages de récupération utilisent `noindex` et `no-referrer`. Le fragment est supprimé du navigateur après succès. La langue peut être changée avant l’utilisation du lien.

Les émissions sont limitées de façon persistante à cinq par adresse sur quinze minutes ; les invitations sont également limitées à vingt par administrateur sur cette période. La protection générale par IP doit être assurée à l’entrée de l’hébergement, avec une source IP fiable. Aucun mot de passe, token complet ou erreur SMTP détaillée n’est journalisé.

Les emails utilisent le SMTP déjà configuré et l’origine canonique `APP_URL`, partagée avec Stripe. HTTPS est obligatoire hors développement local. Ne jamais construire ce lien depuis un en-tête Host fourni par la requête.

Appliquer `npm run db:deploy`, puis générer Prisma et reconstruire/redémarrer. Aucun email réel n’est envoyé par les tests automatisés : ils utilisent une capture SMTP locale ou une fonction d’envoi isolée.
