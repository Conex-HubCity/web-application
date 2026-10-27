import "server-only";
import { isMentorPreviewEnabled, previewRoleAllowed } from "@/lib/release";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const SCRYPT_OPTIONS = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const DUMMY_HASH = `scrypt-v1:${"0".repeat(32)}:${"0".repeat(128)}`;
const publicUser = {
  id: true,
  firstName: true,
  email: true,
  emailVerifiedAt: true,
  accountStatus: true,
  roles: { select: { role: true } },
} as const;

export class AuthError extends Error {}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v1:${salt}:${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const validFormat = /^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored);
  const [, salt, expected] = (validFormat ? stored : DUMMY_HASH).split(":");
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(expected, "hex")) && validFormat;
}

function credentials(input: { email: unknown; password: unknown }, register: boolean) {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthError("Saisissez une adresse email valide.");
  }
  if (password.length < (register ? 8 : 1) || password.length > 128) {
    throw new AuthError(
      register
        ? "Le mot de passe doit contenir entre 8 et 128 caractères."
        : "Email ou mot de passe incorrect.",
    );
  }
  return { email, password };
}

export function sessionData() {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MS);
  return { token, expiresAt, tokenHash: digest(token) };
}

export function createAuthService(
  db: PrismaClient = getDb(),
  options: { mentorPreview?: boolean } = {},
) {
  const mentorPreview = options.mentorPreview ?? isMentorPreviewEnabled();
  // Atomic, persistent per-email window, shared across server processes.
  // A production edge must also limit requests per trusted client IP.
  async function throttle(email: string, operation: "login" | "register") {
    const key = digest(`${operation}:${email}`);
    const rows = await db.$queryRaw<{ attempts: number }[]>`
      INSERT INTO auth_throttles (key, attempts, window_start)
      VALUES (${key}, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET
        attempts = CASE WHEN auth_throttles.window_start < CURRENT_TIMESTAMP - INTERVAL '15 minutes'
          THEN 1 ELSE auth_throttles.attempts + 1 END,
        window_start = CASE WHEN auth_throttles.window_start < CURRENT_TIMESTAMP - INTERVAL '15 minutes'
          THEN CURRENT_TIMESTAMP ELSE auth_throttles.window_start END
      RETURNING attempts
    `;
    if (rows[0].attempts > 5) throw new AuthError("Trop de tentatives. Réessayez dans 15 minutes.");
  }

  return {
    async register(input: {
      email: unknown;
      password: unknown;
      passwordConfirmation: unknown;
      firstName: unknown;
      lastName: unknown;
      role: unknown;
      adultConfirmed: unknown;
    }) {
      if (mentorPreview && input.role !== "MENTOR")
        throw new AuthError("Les inscriptions sont actuellement réservées aux mentors.");
      const { email, password } = credentials(input, true);
      if (typeof input.passwordConfirmation !== "string" || password !== input.passwordConfirmation)
        throw new AuthError("Les deux mots de passe doivent être identiques.");
      const firstName = typeof input.firstName === "string" ? input.firstName.trim() : "";
      const lastName = typeof input.lastName === "string" ? input.lastName.trim() : "";
      if (!lastName || lastName.length > 100)
        throw new AuthError("Saisissez votre nom (100 caractères maximum).");
      if (!firstName || firstName.length > 60)
        throw new AuthError("Saisissez votre prénom (60 caractères maximum).");
      if (input.role !== "FOUNDER" && input.role !== "MENTOR")
        throw new AuthError("Choisissez un parcours d’inscription valide.");
      if (input.adultConfirmed !== true)
        throw new AuthError("Vous devez confirmer avoir 18 ans ou plus.");
      await throttle(email, "register");
      const passwordHash = await hashPassword(password);
      const session = sessionData();
      try {
        await db.user.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName,
            // Authentication does not approve a contact, an account or a professional dossier.
            accountStatus: "PENDING_VERIFICATION",
            roles: { create: { role: input.role } },
            ...(input.role === "FOUNDER"
              ? { founderProfile: { create: { adultConfirmedAt: new Date() } } }
              : { mentorProfile: { create: {} } }),
            sessions: { create: { tokenHash: session.tokenHash, expiresAt: session.expiresAt } },
          },
        });
      } catch (error) {
        if ((error as { code?: string }).code === "P2002") {
          throw new AuthError(
            "Impossible de créer ce compte. Si vous êtes déjà inscrit, connectez-vous.",
          );
        }
        throw error;
      }
      return { token: session.token, expiresAt: session.expiresAt };
    },

    async login(input: { email: unknown; password: unknown }) {
      const { email, password } = credentials(input, false);
      await throttle(email, "login");
      const user = await db.user.findUnique({ where: { email }, include: { roles: true } });
      const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
      if (
        !valid ||
        !user ||
        user.accountStatus === "SUSPENDED" ||
        user.accountStatus === "CLOSED"
      ) {
        throw new AuthError("Email ou mot de passe incorrect.");
      }
      if (mentorPreview && !previewRoleAllowed(user.roles))
        throw new AuthError("L’accès des porteurs de projet n’est pas encore ouvert.");
      const session = sessionData();
      await db.session.create({
        data: { userId: user.id, tokenHash: session.tokenHash, expiresAt: session.expiresAt },
      });
      return { token: session.token, expiresAt: session.expiresAt };
    },

    async getSession(token: string | undefined) {
      if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
      const session = await db.session.findUnique({
        where: { tokenHash: digest(token) },
        select: { expiresAt: true, user: { select: publicUser } },
      });
      if (
        !session ||
        session.expiresAt <= new Date() ||
        ["SUSPENDED", "CLOSED"].includes(session.user.accountStatus) ||
        (mentorPreview && !previewRoleAllowed(session.user.roles))
      )
        return null;
      return session.user;
    },

    async logout(token: string | undefined) {
      if (token && /^[a-f0-9]{64}$/.test(token)) {
        await db.session.deleteMany({ where: { tokenHash: digest(token) } });
      }
    },
  };
}
