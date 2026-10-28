# Contribution unique Stripe

## Parcours V1

Inscription mentor et acceptation de la charte → vérification email → contribution unique de **30 USD** → remerciement. La personne peut s’arrêter à ce soutien sans déposer de document. Si elle souhaite devenir mentor, le bouton de poursuite ouvre le dossier d’expérience. Les contrôles de documents et la validation administrative restent obligatoires pour le statut de mentor approuvé.

La contribution finance l’hébergement, la maintenance et le fonctionnement de Connex. Elle ne crée ni abonnement ni adhésion métier dans `Membership`, ne publie pas le profil, ne valide pas les pièces et ne garantit pas l’acceptation de la candidature. La règle des remboursements commerciaux après refus n’est pas automatisée : ne pas promettre une politique non décidée. Les remboursements effectués dans Stripe sont synchronisés.

## Configuration privée

```dotenv
STRIPE_MODE="test"
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
APP_URL="http://localhost:3000"
```

Renseigner une clé `sk_test_…` et le secret de signature `whsec_…` du webhook. Aucune clé publique n’est nécessaire pour la redirection serveur Checkout. `APP_URL` est l’origine canonique du site, sans chemin ; ne jamais construire les URL de retour à partir de l’en-tête Host. En production utiliser HTTPS. Pour encaisser réellement, passer `STRIPE_MODE="live"`, renseigner les clés du même environnement et l’origine publique HTTPS, puis reconstruire et redémarrer.

Les clés restent privées et exclues de Git. Sans configuration complète, la page affiche la contribution mais désactive son bouton, sans faux succès ni paiement simulé. Le mode test est signalé à l’utilisateur et les paiements test ne débloquent jamais l’environnement live.

## Checkout et confirmation

Le SDK serveur Stripe crée une session Checkout hébergée (`mode=payment`, `ui_mode=hosted_page` avec le SDK 23). Le montant est fixé côté serveur à 3000 cents USD. Adaptive Pricing est désactivé, aucune remise ni quantité modifiable n’est proposée. Les moyens de paiement sont filtrés sur la carte pour cette V1.

Chaque tentative persistée possède une clé d’idempotence. Des clics concurrents réutilisent la même tentative et la même session. Une session ouverte est reprise ; une expiration confirmée par Stripe permet une nouvelle tentative. Un retour annulé ne supprime pas une tentative ni ne suppose un échec. Une session complétée mais non payée ne débloque pas l’upload. Une création dont la réponse est perdue reste récupérable avec la même clé ; au-delà de 23 heures sans identifiant de session, le parcours demande une vérification opérateur au lieu de risquer un second paiement. Limite de cinq nouvelles tentatives par compte sur quinze minutes.

L’endpoint **POST `/api/stripe/webhook`** vérifie la signature sur le corps brut. Créer le webhook avec la version API `2026-09-30.endive`, correspondant au SDK installé. Événements à activer :

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `charge.refunded`

Les événements sont traités de façon idempotente et enregistrés sans leur payload. Les confirmations relisent la session depuis Stripe et vérifient compte, tentative, montant, devise, environnement et statut réellement payé. La page de retour fait la même vérification serveur et exige que la session appartienne au compte connecté. Une URL de succès seule ne confère aucun droit. Les webhooks permettent de confirmer même si la personne ferme le navigateur.

Un remboursement partiel conserve le soutien ; le remboursement complet retire le droit de déposer de nouveaux documents. Les événements tardifs ou répétés ne restaurent pas un paiement intégralement remboursé. Les documents et décisions administratives déjà enregistrés restent conservés.

## Base et tests

`ContributionPayment` conserve les tentatives, références Stripe et statuts `PENDING`, `PAID`, `FAILED`, `EXPIRED`, `REFUNDED`, avec les dates et le montant remboursé. `StripeWebhookEvent` déduplique les événements traités. Ces tables financières ne sont pas supprimées en cascade avec le compte.

Appliquer `npm run db:deploy`, puis `npm run db:generate`. Le MCD comporte désormais 19 modèles. Les comptes existants ne sont pas marqués comme ayant payé ; les comptes administrateurs gardent leur accès admin indépendant.

Pour les tests manuels locaux avec les clés de test et Stripe CLI déjà installée :

```sh
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copier le secret `whsec_…` affiché par cette session dans `.env`, puis tester un vrai Checkout en mode test. Un `stripe trigger` générique sans les métadonnées et la tentative Connex ne débloque pas un utilisateur.

Les tests automatisés utilisent un adaptateur Stripe isolé et des signatures de test, sans charge ni accès au réseau Stripe. Le parcours réel hébergé doit être vérifié après fourniture des clés : paiement réussi, annulation, authentification carte, réception du webhook, reprise sans double paiement et remboursement.
