# Conex — MCD V1 et premières règles de données

Statut : MCD synchronisé avec les 16 modèles du schéma Prisma le 21 octobre 2026.
Les diagrammes reprennent les colonnes et clés du schéma actuel, y compris les sessions,
les preuves de validation mentor et les certifications de test.
Les migrations sont appliquées dans la base locale dédiée `conex`. Voir les
[notes de réalisation](prisma-v1.md) pour les garanties et les intégrations restantes.

Ce document formalise les règles précisées dans la conversation. Les propositions
qui restent à décider sont signalées explicitement. Les tables financières et le
module de dotations ne sont pas détaillés ici.

## 1. Règles retenues

- `users` porte les données communes aux comptes.
- `mentor_profiles` porte les données propres au mentor.
- Un mentor peut déposer plusieurs documents privés : CV et justificatifs de son
  expertise. Leur examen alimente la validation de sa candidature.
- `founder_profiles` porte les données propres au porteur de projet, avant,
  pendant et après son accompagnement. Ce nom ne dépend pas de l’existence d’un
  mentorat actif.
- Les deux tables de profils utilisent `user_id` comme clé primaire ET clé
  étrangère vers `users.id` : aucune duplication des identifiants de connexion.
- Un mentor peut choisir un profil privé ou demander sa visibilité sur la
  plateforme. Ce choix est indépendant de l’état de validation de son compte.
- Un porteur ne peut avoir qu’un seul projet courant.
- Le remplacement du projet exige DEUX conditions simultanées : aucun mentorat
  actif sur ce projet ET au moins 30 jours sans suivi.
- Le remplacement conserve les anciennes versions, décisions, demandes et suivis.

## 2. Identité commune et profils spécialisés

Nomenclature retenue pour le porteur de projet : modèle `FounderProfile`, table
`founder_profiles`, rôle `FOUNDER` et clé de relation `founder_user_id`.

```mermaid
erDiagram
    USERS ||--o| MENTOR_PROFILES : possede
    USERS ||--o| FOUNDER_PROFILES : possede
    USERS ||--o{ USER_ROLES : dispose_de
    USERS ||--o{ SESSIONS : ouvre
    FOUNDER_PROFILES ||--o{ CERTIFICATION_EVIDENCES : depose
    FOUNDER_PROFILES ||--o| PROJECTS : porte
    PROJECTS ||--|{ PROJECT_REVISIONS : conserve
    MENTOR_PROFILES ||--o{ MEMBERSHIPS : adhere
    MENTOR_PROFILES ||--o{ MENTOR_DOCUMENTS : fournit

    USERS {
        uuid id PK
        string email UK
        string phone UK
        string password_hash
        string first_name
        string last_name
        datetime email_verified_at
        datetime phone_verified_at
        string account_status
        datetime created_at
        datetime updated_at
    }
    USER_ROLES {
        uuid user_id PK,FK
        string role PK
        datetime created_at
    }
    MENTOR_PROFILES {
        uuid user_id PK,FK
        string professional_title
        string biography
        string country_code
        string city
        string_array languages
        string_array expertise
        string_array preferred_sectors
        string_array preferred_country_codes
        string availability
        string motivations
        string verification_status
        datetime submitted_at
        string visibility_preference
        datetime visibility_requested_at
        datetime charter_accepted_at
        datetime created_at
        datetime updated_at
    }
    FOUNDER_PROFILES {
        uuid user_id PK,FK
        string biography
        string country_code
        string city
        string sector
        string_array languages
        string_array skills
        string availability
        datetime adult_confirmed_at
        datetime created_at
        datetime updated_at
    }
    MENTOR_DOCUMENTS {
        uuid id PK
        uuid mentor_user_id FK
        string document_type
        string original_filename
        string private_storage_key UK
        string mime_type
        bigint size_bytes
        string checksum
        string scan_status
        string review_status
        uuid supersedes_document_id FK
        datetime uploaded_at
        datetime withdrawn_at
    }
    CERTIFICATION_EVIDENCES {
        uuid id PK
        uuid founder_user_id FK
        string private_storage_key UK
        string original_filename
        string mime_type
        bigint size_bytes
        string checksum
        string scan_status
        string certificate_reference
        string holder_name
        date issued_at
        string cohort
        string verification_status
        datetime submitted_at
        datetime withdrawn_at
        boolean is_test
    }
    PROJECTS {
        uuid id PK,FK
        uuid founder_user_id FK,UK
        uuid current_revision_id FK,UK
        datetime created_at
        datetime updated_at
    }
    PROJECT_REVISIONS {
        uuid id PK
        uuid project_id FK
        int revision_number
        string title
        string summary
        string sector
        string stage
        string market
        string impact
        string team
        string risks
        string_array support_needs
        string review_status
        string private_pitch_storage_key UK
        string pitch_original_filename
        bigint pitch_size_bytes
        string pitch_checksum
        string pitch_scan_status
        datetime submitted_at
        datetime published_at
        datetime archived_at
        datetime created_at
        datetime updated_at
    }
    MEMBERSHIPS {
        uuid id PK
        uuid mentor_user_id FK
        string status
        datetime starts_at
        datetime ends_at
        datetime created_at
        datetime updated_at
    }

    SESSIONS {
        uuid id PK
        string token_hash UK
        uuid user_id FK
        datetime expires_at
        datetime created_at
    }
    AUTH_THROTTLES {
        string key PK
        int attempts
        datetime window_start
    }
```

La notation `PK` désigne une clé primaire, `FK` une clé étrangère et `UK` une
contrainte d’unicité sur une colonne. Les colonnes reprennent le schéma actuel ;
les types PostgreSQL précis, la nullabilité, les index et les valeurs par défaut
sont définis dans `prisma/schema.prisma`. Les types `string_array` désignent des listes PostgreSQL.
Les unicités et références composites sont précisées ci-dessous, sans laisser
entendre que chaque colonne du groupe serait unique individuellement.

`USER_ROLES` permet de distinguer les permissions `MENTOR`, `FOUNDER` et `ADMIN`.
Cette structure permet techniquement plusieurs rôles, mais n’autorise pas encore
le cumul mentor/porteur dans le produit : ce choix reste à confirmer.

Langues et domaines d’expertise sont représentés dans le premier schéma Prisma
par des listes PostgreSQL ; leurs codes et référentiels restent à préciser.
Disponibilités détaillées et secteurs restent à affiner. Les champs du diagramme
expriment les concepts, pas un catalogue de valeurs définitivement arrêté.

## 3. Validation, demandes et accompagnement

```mermaid
erDiagram
    USERS ||--o{ VALIDATION_DECISIONS : admin_decide
    VALIDATION_DECISIONS ||--o{ MENTOR_VALIDATION_DOCUMENTS : retient
    MENTOR_DOCUMENTS ||--o{ MENTOR_VALIDATION_DOCUMENTS : sert_de_preuve
    MENTOR_DOCUMENTS o|--o{ MENTOR_DOCUMENTS : remplace
    USERS o|--o{ MENTORSHIP_REQUESTS : examine
    USERS o|--o{ FOLLOW_UPS : approuve
    CERTIFICATION_EVIDENCES o|--o{ VALIDATION_DECISIONS : concerne_certificat
    MENTOR_PROFILES o|--o{ VALIDATION_DECISIONS : concerne_mentor
    MENTOR_DOCUMENTS o|--o{ VALIDATION_DECISIONS : concerne_document
    PROJECT_REVISIONS o|--o{ VALIDATION_DECISIONS : concerne_projet
    MENTOR_PROFILES ||--o{ MENTORSHIP_REQUESTS : demande
    PROJECT_REVISIONS ||--o{ MENTORSHIP_REQUESTS : recoit
    MENTORSHIP_REQUESTS ||--o| MENTORSHIPS : aboutit_a
    MENTORSHIPS ||--o{ FOLLOW_UPS : possede
    USERS ||--o{ FOLLOW_UPS : redige

    VALIDATION_DECISIONS {
        uuid id PK
        uuid reviewer_user_id FK
        uuid certification_evidence_id FK
        uuid mentor_user_id FK
        uuid mentor_document_id FK
        uuid project_revision_id FK
        string outcome
        string reason
        datetime decided_at
    }
    MENTORSHIP_REQUESTS {
        uuid id PK
        uuid mentor_user_id FK
        uuid project_revision_id FK
        string status
        string message
        uuid reviewed_by_user_id FK
        string review_reason
        datetime reviewed_at
        datetime intro_meeting_at
        datetime intro_meeting_held_at
        datetime mentor_consented_at
        datetime founder_consented_at
        datetime created_at
        datetime updated_at
    }
    MENTORSHIPS {
        uuid id PK
        uuid request_id FK,UK
        string status
        datetime activated_at
        datetime ended_at
        string closure_reason
        datetime updated_at
    }
    FOLLOW_UPS {
        uuid id PK
        uuid mentorship_id FK
        uuid author_user_id FK
        string type
        string status
        string summary
        string goals
        string progress
        string blockers
        string next_actions
        date report_period
        datetime occurred_at
        datetime recorded_at
        uuid reviewed_by_user_id FK
        datetime reviewed_at
        string review_reason
        datetime updated_at
    }

    MENTOR_VALIDATION_DOCUMENTS {
        uuid decision_id PK,FK
        uuid mentor_document_id PK,FK
        uuid mentor_user_id FK
        datetime linked_at
    }
```

Chaque décision vise exactement UNE cible : une preuve de certification, un
profil mentor, un document mentor ou une version de projet. Les quatre clés étrangères de cible sont
facultatives individuellement ; une contrainte PostgreSQL impose qu’une seule
soit renseignée. Cela évite un identifiant polymorphe sans intégrité référentielle.

La vérification d’un email ou téléphone ne remplace pas une validation métier.
Le certificat Rouge, la candidature mentor et le pitch restent des validations
distinctes. Les décisions successives sont conservées, avec administrateur, date
et motif ; le dernier état opérationnel est mis à jour dans la même transaction.

L’autorisation de décider doit être contrôlée côté serveur : la simple existence
de `reviewer_user_id` ne prouve pas que son compte est administrateur.

Un mentorat ne devient actif qu’après validation CNX, rencontre introductive et
consentement explicite des deux personnes. Il reste lié à la version de projet
qui a motivé la demande, par l’intermédiaire de `MENTORSHIP_REQUESTS`.

### Documents du mentor

Modèle implémenté : `MentorDocument`, table `mentor_documents`, avec une relation
plusieurs-vers-un vers `MentorProfile` par `mentor_user_id`.

| Champ                                                      | Usage                                                                                     |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `document_type`                                            | Nature de la pièce : `CV`, `CERTIFICATE`, `DEGREE`, `WORK_REFERENCE` ou `OTHER_EVIDENCE`. |
| `private_storage_key`                                      | Référence du fichier dans un stockage privé, jamais une URL publique permanente.          |
| `original_filename`, `mime_type`, `size_bytes`, `checksum` | Métadonnées nécessaires au contrôle et à la traçabilité du dépôt.                         |
| `scan_status`                                              | Contrôle technique du fichier, distinct de l’examen métier.                               |
| `review_status`                                            | État d’examen de la pièce : en attente, acceptée ou refusée.                              |
| `supersedes_document_id`                                   | Pièce précédente remplacée, si le mentor dépose une nouvelle version.                     |
| `uploaded_at`, `withdrawn_at`                              | Dates de dépôt et de retrait éventuel.                                                    |

Parcours prévu : le mentor téléverse ses pièces ; les contrôles de fichier sont
effectués avant consultation ; un administrateur autorisé examine les preuves,
puis prend une décision motivée sur la candidature mentor. Une pièce refusée peut
être remplacée par un nouveau dépôt, sans écraser la précédente ni ses décisions.
Le remplacement doit concerner un document du même mentor.

L’acceptation d’un CV ou d’un justificatif ne valide pas automatiquement le mentor
et n’active pas son adhésion. La validation globale du profil est une décision
distincte. Les pièces retenues comme preuves lors de cette décision sont tracées dans
`mentor_validation_documents` ; leur retrait ou remplacement ultérieur ne doit pas modifier
rétroactivement le dossier examiné.

Ces documents sont accessibles au mentor propriétaire et aux membres de l’équipe
CNX habilités à vérifier sa candidature, via des accès temporaires contrôlés. Ils
ne deviennent pas publics lorsque le mentor choisit un profil visible et ne sont
pas accessibles automatiquement aux porteurs de projets ou aux autres mentors.

Avant de brancher les écrans de dépôt, préciser les pièces obligatoires, les formats acceptés,
les limites de taille et de nombre, la durée de conservation et la procédure de
réexamen lorsqu’une preuve essentielle est retirée. Aucun caractère obligatoire
du CV ou d’un diplôme particulier n’est fixé à ce stade.

## 4. Visibilité du mentor

| Préférence | Comportement prévu                                                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRIVATE`  | Profil absent du catalogue de mentors ; le mentor peut toujours découvrir les projets et demander une rencontre s’il dispose des droits nécessaires. |
| `PLATFORM` | Profil proposé à la visibilité dans la plateforme, sous réserve des conditions d’activation.                                                         |

Implémentation actuelle : profil privé par défaut. `PLATFORM` signifie une visibilité dans
l’espace Conex autorisé, pas une publication sur Internet ni une indexation dans
les moteurs de recherche.

Le choix de visibilité ne doit pas activer un compte, valider une candidature ou
donner accès aux dossiers. La visibilité effective est calculée à partir de la
préférence et des droits applicables : compte actif, vérification mentor acceptée
et adhésion active. Le passage en privé retire le mentor du catalogue, sans
annuler les demandes ni les compagnonnages existants.

Un profil privé reste identifiable par l’équipe Conex et par ses interlocuteurs
autorisés dans une demande ou un mentorat. « Privé » ne signifie pas anonyme.

À confirmer : le passage de privé à visible prend-il effet automatiquement quand
ces conditions sont réunies, ou demande-t-il une approbation supplémentaire CNX ?

## 5. Un projet courant, avec historique

`PROJECTS.founder_user_id` est unique : un porteur possède au maximum un dossier
projet. Ce dossier conserve ses versions et désigne une seule version courante.
Un remplacement crée une nouvelle version ; il ne détruit ni l’ancienne
présentation ni les accompagnements qui lui étaient associés.

Cette représentation distingue la limite métier d’un projet courant du besoin de
conserver les projets remplacés dans l’historique. Un dossier et sa première
version sont créés ensemble dans une transaction.

### Condition confirmée pour remplacer le projet

```text
remplacement_autorise =
    aucun_mentorat_actif_sur_le_projet
    ET
    au_moins_30_jours_ecoules_sans_suivi
```

| Situation                                          | Remplacement                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| Aucun mentorat actif, moins de 30 jours sans suivi | Refusé                                                                 |
| Aucun mentorat actif, au moins 30 jours sans suivi | Autorisé                                                               |
| Mentorat actif, moins de 30 jours sans suivi       | Refusé                                                                 |
| Mentorat actif, au moins 30 jours sans suivi       | Refusé : le mentorat doit d’abord être clôturé selon le processus CNX. |

L’écoulement de 30 jours ne clôture pas automatiquement un mentorat. Dans le
service actuel, les états `ACTIVE` et `PAUSED` bloquent tous deux le remplacement
jusqu’à une clôture documentée ; cette politique des pauses reste à confirmer côté produit.

Un nouveau projet doit repasser par la validation du pitch. La validation de
l’ancienne version n’est pas transférée. Les anciennes demandes ne sont pas
rattachées automatiquement au nouveau projet. La certification du porteur reste
une validation séparée.

Les corrections de forme et les réponses à une demande de révision doivent être
distinguées du remplacement de projet ; le périmètre exact sera précisé avant
l’implémentation pour ne pas bloquer une simple correction de texte.

### Calcul du délai sans suivi — confirmé pour la V1

- Un suivi qualifiant correspond à un rendez-vous réalisé, y compris la rencontre
  introductive, ou à un compte rendu/bilan approuvé, pas à une connexion, un message
  ou un brouillon.
- Le point de départ est le plus récent entre ces suivis et la première soumission
  de la version courante ; s’il n’y a jamais eu de suivi, cette soumission fait foi.
- La durée retenue est de 30 jours écoulés, calculés côté serveur en UTC.
- Avant toute première soumission, le dossier reste préparatoire ; les règles de
  modification du brouillon sont à distinguer du changement de projet soumis.

Le contrôle est implémenté dans le service de remplacement, avec un verrou de
transaction partagé par l’activation d’un mentorat et l’enregistrement des suivis.

## 6. Contrôles implémentés en PostgreSQL et dans les services

1. Unicité de l’email normalisé et des clés de profils `user_id`.
2. Une seule ligne `PROJECTS` par porteur ; unicité du couple
   `(project_id, revision_number)`.
3. La version courante appartient au même projet grâce à une référence composite
   `(id, current_revision_id)` vers `(project_id, id)`.
4. Vérifier les deux conditions de remplacement côté serveur, dans une
   transaction qui verrouille le projet. L’activation d’un mentorat et
   l’enregistrement d’un suivi qualifiant doivent utiliser le même verrou pour
   éviter une course avec le remplacement.
5. Bloquer l’accès confidentiel d’un mentor non vérifié, non adhérent, suspendu ou
   dont les droits ont expiré. La visibilité de son profil ne lui accorde aucun
   droit supplémentaire.
6. L’auteur d’un suivi doit être autorisé sur le binôme concerné. Un porteur ne
   peut ni clôturer arbitrairement un mentorat ni modifier la date d’un suivi pour
   débloquer un changement.
7. Conserver les décisions, versions et liens historiques. La politique de
   suppression et de conservation reste à définir avant les données réelles.

## 7. Décisions produit restantes

- Cumul des profils mentor et porteur sur un même compte, ou rôles exclusifs au
  lancement.
- Visibilité mentor : choix autonome ou validation supplémentaire par CNX ;
  audience exacte du catalogue.
- Confirmation produit du blocage des mentorats en pause. Le service actuel les
  bloque ; les anciennes demandes ne peuvent pas être activées sur une version archivée.
- Périmètre éditorial des corrections après soumission. Le service autorise
  actuellement les modifications en `DRAFT` et `CHANGES_REQUESTED`.
- Un seul mentor actif par projet, ou plusieurs : aucune unicité de binôme par
  projet n’est imposée tant que ce point n’est pas décidé.

Prisma et les services séparent la validation de compte, la certification, la
publication du projet et l’activation du mentorat. Les paiements, les rendez-vous
détaillés et les interfaces mentor restent à brancher. L’inscription, la
connexion et les sessions sont déjà en place ; la vérification du contact et
l’activation des comptes restent distinctes et ne sont pas simulées par le dépôt d’un certificat.

## 8. Sessions, fichiers et garanties complémentaires

- `sessions` relie un jeton de session haché à son compte et à une expiration.
  Le cookie contient le jeton aléatoire, jamais le rôle faisant autorité. Le serveur
  relit les rôles et refuse les comptes suspendus ou fermés.
- `auth_throttles` conserve une fenêtre de tentatives par clé hachée email/opération.
  Cette table ne possède pas de relation vers `users` : elle couvre aussi les emails
  qui ne correspondent à aucun compte.
- `mentor_validation_documents` possède une clé primaire composée de
  `(decision_id, mentor_document_id)`. Ses deux références composites incluent
  `mentor_user_id` : la décision et la pièce appartiennent au même mentor.
- Les versions de documents mentor utilisent également une référence composite
  garantissant que la pièce remplacée appartient au même propriétaire.
- `certification_evidences.is_test` distingue les approbations simulées en local.
  Cette origine est immuable ; une preuve de test ne donne aucun accès en production.
  Cette simulation concerne les porteurs de projet, pas les candidatures mentor.
- Les justificatifs WoeAcademy sont stockés dans `uploads/private/certifications/`.
  `uploads/public/` est réservé aux futurs fichiers partageables et n’est pas servi
  automatiquement. Les CV et preuves mentor sont déposés dans `uploads/private/mentors/`.

## 9. Parcours mentor après connexion

Le [parcours mentor V1](mentor-onboarding-v1.md) est branché : contrôle serveur à
l’entrée du tableau de bord, dépôt privé des pièces et page d’attente. Aucun champ
Prisma supplémentaire n’est nécessaire.

| Étape               | Règle et état actuel                                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inscription         | Compte `PENDING_VERIFICATION`, rôle `MENTOR`, profil `DRAFT`, visibilité `PRIVATE`.                                                                       |
| Dépôt initial       | Autorisé au mentor authentifié, même avant vérification du contact. CV et/ou justificatifs, engagements acceptés, activité et expérience facultatives.    |
| Fichiers            | Jusqu’à cinq fichiers et 5 Mio au total par soumission ; PDF, Word ou images. Stockage privé, contrôle du format, états technique et métier `PENDING`.    |
| Soumission          | Profil `PENDING`, `submitted_at` et `charter_accepted_at` renseignés. Redirection vers `/mentor/validation`.                                              |
| Validation          | Décisions par pièce puis décision globale avec les preuves retenues. Backend existant ; interface d’examen et analyse antivirus à brancher.               |
| Tableau de bord     | Accès après candidature approuvée, engagements acceptés et présence d’une pièce acceptée, contrôlée et non retirée. Contrôle refait côté serveur.         |
| Refus ou retrait    | Retour au dépôt après refus/révocation ou absence de pièces disponibles. L’historique est conservé.                                                       |
| Contact et adhésion | Restent indépendants de l’accès au tableau de bord. Les actions métier sur les projets exigent toujours compte actif, contact vérifié et adhésion active. |
| Visibilité          | Le dépôt et l’approbation ne publient jamais le CV. Préférence `PRIVATE` conservée par défaut.                                                            |

Les champs métier du profil professionnel sont modélisés ; seuls l’activité et
le texte d’expérience sont pour le moment proposés avec le dépôt. Le CV reste
facultatif lorsqu’un autre justificatif est fourni. L’approbation globale exige
au moins une preuve acceptée et la charte ; l’analyse technique ne remplace pas
la décision administrative. Les paiements, l’édition du profil et les actions détaillées de demande
et de suivi constituent les étapes suivantes.

Le tableau de bord mentor utilise maintenant ces relations pour ses six vues :
vue d’ensemble, projets, demandes, accompagnements, profil et adhésion. Les
requêtes d’activité sont limitées au mentor authentifié, et les projets réservés
restent filtrés par les droits existants. Cette interface ne nécessite aucun
changement de schéma. Voir le [parcours mentor](mentor-onboarding-v1.md) pour
les vues réalisées et les actions restant à brancher.
