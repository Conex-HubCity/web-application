# Certification onboarding V1

After signup/login, `/compte` loads the authenticated profile on the server. Founders without an approved, clean, non-withdrawn WoeAcademy Red-level certificate are redirected to `/certification`. Direct requests to the account page run the same check. Mentors are not subject to the WoeAcademy prerequisite.

The certification form accepts a nonempty document up to 5 MiB. Its Server Action derives the owner from the session and the service rechecks account status, founder role and profile inside a transaction. Uploads are serialized per user. The original filename is sanitized metadata only; storage uses random filenames under `uploads/private/certifications/`, outside Next.js's `public/`, ignored by Git and Prettier. Database failures remove newly written files. Files are not served through a public route.

`uploads/private/` holds confidential documents. `uploads/public/` is reserved for future shareable uploads; it is not automatically served by Next.js. Only directory placeholders are versioned. Storage keys such as `certifications/<uuid>` remain relative to the private storage root, so moving the former `.private/certifications/` directory does not rewrite immutable evidence records.

For the requested local simulation, `.env` has `CERTIFICATION_TEST_MODE="true"`. When this flag is enabled **and** `NODE_ENV` is not `production`, any accepted upload is marked clean and approved with `isTest=true`. This opens the founder panel immediately. The fourth migration adds an immutable origin marker so a simulated approval cannot be silently relabelled as a real one. Simulated approvals do not create an administrator decision or mark an email verified.

In production, or with the flag disabled, files remain pending review/scanning and do not unlock the panel. Test evidence is ignored by both the onboarding gate and the domain services outside local test mode, even if the environment flag is accidentally enabled in production. A production review/scanning pipeline and durable private object storage still need to be connected. Local disk storage assumes a writable, persistent server filesystem.

The account panel shows the real first/last name, role, certification state and an existing project's title if present. It introduces the next project/mentorship steps; project editing remains subsequent work. Mentor submission and review waiting are now implemented separately; see [mentor onboarding](mentor-onboarding-v1.md). Certification does not automatically activate the account or verify the email, and existing business authorization checks still apply.

Integration tests cover local arbitrary-file approval, owner isolation, idempotent concurrent uploads, immutable test origin, revocation, production exclusion, ordinary pending uploads, empty/oversized files and suspended/mentor rejection.

## Email confirmé avant accès

La confirmation email par OTP est désormais obligatoire avant les dépôts et les fonctionnalités protégées. Elle reste distincte de l’acceptation du compte mentor et de la certification WoeAcademy. Les modes de simulation des justificatifs ne confirment jamais un email. Voir [la configuration OTP et SMTP](email-verification.md).
