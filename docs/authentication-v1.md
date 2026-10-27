# Authentication V1

Registration and login now use PostgreSQL. `/inscription/porteur` creates a `FOUNDER` and `FounderProfile`; `/inscription/mentor` creates a `MENTOR` and a private, unapproved `MentorProfile`. Both create a limited authenticated session and redirect to `/verification-email` until email confirmation. Public signup cannot create `ADMIN` roles. Login accepts only email/password; the account page reads roles from the database.

The account page now also checks founder certification on the server and redirects uncertified founders to `/certification`. See [certification onboarding](certification-v1.md) for private uploads and the local-only automatic approval mode.

Accounts initially remain `PENDING_VERIFICATION`. SMTP email OTP confirmation sets the verified email date and activates the account without approving its professional dossier. Existing unverified accounts, including administrators, are subject to the same gate. Password recovery remains separate work. See [email verification](email-verification.md).

Passwords use Node.js asynchronous scrypt (`N=131072`, `r=8`, `p=1`), a random 16-byte salt and a 64-byte derived key. Passwords accept 8–128 characters on registration and are never trimmed. Registration requires a matching password confirmation, checked on the server and never stored. See the [Node.js crypto reference](https://nodejs.org/download/release/v20.19.5/docs/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback).

Sessions use random 32-byte bearer tokens in an HttpOnly, SameSite=Lax cookie, Secure in production, expiring after seven days. Only SHA-256 token hashes are persisted. Every session lookup checks expiry and the current account status and roles. Logout deletes the server session and cookie. Session data is not put into a shared cache. Next Server Actions provide same-origin submission checks; forms show pending/error states.

The third migration adds `sessions` and `auth_throttles`. Authentication attempts are atomically limited to five per email/operation in a fixed 15-minute window, including successful attempts. This works across server instances. Production hosting must additionally limit requests per trusted source IP to protect against attempts distributed across different emails. A future maintenance job should remove expired sessions and stale throttle entries; their expiry is already enforced on reads.

Run `npm run db:deploy` to apply committed migrations, then `npm run db:generate`. SMTP credentials and a private `EMAIL_OTP_SECRET` are now required for email confirmation. The public `/espace` route remains explicitly a demonstration and does not expose account data.

Integration tests run against an isolated temporary PostgreSQL schema: registration for both roles, blocked privileged signup, input validation, duplicate accounts, incorrect passwords, role tampering, expiry/logout, suspended/closed accounts, and concurrent throttling. Database credentials and real application tables are not changed by these tests.

Mentor accounts are now routed by the server to private document submission, review waiting or the dashboard according to their stored candidature status. See [mentor onboarding](mentor-onboarding-v1.md). No applicant can approve their own documents or candidature.
