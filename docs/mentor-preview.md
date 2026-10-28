# Préversion déployable réservée aux mentors

Activer `MENTOR_PREVIEW_MODE="true"` dans l’environnement du serveur **au build et à l’exécution**. La valeur est privée, sans préfixe `NEXT_PUBLIC_`. Après un changement de mode, reconstruire et redémarrer l’application afin de mettre à jour les pages publiques prérendues. `.env.example` et l’environnement local activent cette préversion.

## Parcours public

- Inscription et connexion des mentors uniquement ; aucune sélection de rôle sur la connexion.
- Dépôt des justificatifs et acceptation des engagements.
- Attente d’examen ; refus et nouvelle soumission restent disponibles.
- Après validation de candidature, de charte et d’au moins une preuve acceptée et contrôlée : page confirmant l’acceptation du compte, le développement en cours et une notification à l’ouverture.
- Aucun tableau de bord, paiement d’adhésion, catalogue ou édition de profil dans cette préversion. Le compte n’a pas à souscrire une adhésion pour voir la confirmation.

Les liens d’inscription porteur sont supprimés ou désactivés. `/inscription/porteur` et `/certification` redirigent vers l’inscription mentor ; `/espace` redirige vers l’accueil. Ces routes conservent leur préfixe de langue. Les contenus présentant le futur parcours porteur peuvent rester consultables.

Les protections sont serveur : une inscription porteur falsifiée est refusée, une connexion porteur ne crée pas de session et les anciennes sessions porteur ne permettent plus d’accéder aux pages authentifiées tant que ce mode est actif. Les comptes existants restent en base. Les comptes administrateurs conservent la possibilité de s’authentifier pour les futurs outils internes ; aucune inscription administrateur publique n’est permise. La page compte publique ne leur ouvre pas de tableau de bord en préversion.

Les actions publiques d’édition de profil, d’ajout de pièces après approbation et de certification sont bloquées. Les services métier et le schéma complet restent disponibles pour développer le backend. Le premier dépôt mentor reste autorisé. Une nouvelle pièce n’est jamais approuvée automatiquement.

## Notification et validation

La page annonce une notification future par email. Elle n’affirme pas qu’un email a déjà été envoyé. Aucun système d’envoi automatique n’est ajouté : la notification d’ouverture devra être réalisée via un futur outil d’envoi ou une campagne manuelle. Les adresses des mentors sont déjà conservées avec leurs comptes.

Le processus de revue administrative et les contrôles de fichiers restent nécessaires avant toute approbation. La préversion ne valide ni les justificatifs ni les candidatures automatiquement.

## Revenir au mode complet

Passer `MENTOR_PREVIEW_MODE="false"`, reconstruire puis redémarrer. Les inscriptions et connexions porteur, la certification, la démonstration et les tableaux de bord retrouvent leur fonctionnement antérieur. Les contrôles métier du mode complet (validation, vérification du contact, adhésion) restent applicables. Aucune migration ou suppression de données n’est nécessaire. La fonctionnalité pourra ensuite être retirée sans modifier le modèle de données.

## Vérification de cette version

33 tests réussis, lint et compilation de production réussis. Vérification en navigateur avec des comptes temporaires : inscription mentor réelle, refus d’une inscription falsifiée en porteur, dépôt d’un justificatif, attente, refus, puis page d’acceptation sans tableau de bord. Le français et l’anglais et les largeurs 1440, 390 et 320 pixels ont été contrôlés sans erreur d’hydratation. Le mode complet a été vérifié séparément : inscription porteur, anciennes sessions porteur, démonstration et tableau de bord mentor retrouvent leur fonctionnement. Les comptes et fichiers de contrôle ont été supprimés.

## Email confirmé avant accès

La confirmation email par OTP est désormais obligatoire avant les dépôts et les fonctionnalités protégées. Elle reste distincte de l’acceptation du compte mentor et de la certification WoeAcademy. Les modes de simulation des justificatifs ne confirment jamais un email. Voir [la configuration OTP et SMTP](email-verification.md).

## Contribution avant dépôt

Le parcours inclut désormais une contribution unique de 30 USD après vérification email. Le soutien peut s’arrêter au remerciement sans document ; la candidature mentor est une poursuite facultative. Le dépôt direct est contrôlé côté serveur et nécessite un paiement confirmé dans le bon environnement Stripe. Voir [l’intégration Stripe](stripe-contributions.md).
