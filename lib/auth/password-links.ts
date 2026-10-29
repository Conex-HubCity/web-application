import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient, Prisma, PasswordTokenPurpose } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { AuthError, hashPassword } from "./service";
import { sendAccountEmail } from "@/lib/mail/smtp";
import { localizePath, type Locale } from "@/lib/i18n/config";

const invalid = () => new AuthError("Ce lien est invalide ou a expiré. Demandez un nouveau lien.");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const available = (user: { accountStatus: string }) =>
  !["SUSPENDED", "CLOSED"].includes(user.accountStatus);
export type PasswordMail = { to: string; subject: string; text: string };
export function passwordLinkOrigin(env: Partial<NodeJS.ProcessEnv> = process.env) {
  let url: URL;
  try {
    url = new URL(env.APP_URL ?? "");
  } catch {
    throw new AuthError("L’envoi du lien est momentanément indisponible.");
  }
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(
        env.NODE_ENV !== "production" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  )
    throw new AuthError("L’envoi du lien est momentanément indisponible.");
  return url.origin;
}
export function createPasswordLinkService(
  db: PrismaClient = getDb(),
  options: {
    send?: (message: PasswordMail) => Promise<void>;
    now?: () => Date;
    env?: Partial<NodeJS.ProcessEnv>;
  } = {},
) {
  const now = options.now ?? (() => new Date());
  const send = options.send ?? sendAccountEmail;
  const env = options.env ?? process.env;
  async function limited(keyText: string, limit = 5) {
    const key = hash(keyText);
    const rows = await db.$queryRaw<{ attempts: number }[]>`
      INSERT INTO auth_throttles (key, attempts, window_start) VALUES (${key},1,CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN auth_throttles.window_start < CURRENT_TIMESTAMP - INTERVAL '15 minutes' THEN 1 ELSE auth_throttles.attempts+1 END,
      window_start = CASE WHEN auth_throttles.window_start < CURRENT_TIMESTAMP - INTERVAL '15 minutes' THEN CURRENT_TIMESTAMP ELSE auth_throttles.window_start END
      RETURNING attempts`;
    return rows[0].attempts > limit;
  }
  async function issue(userId: string, locale: Locale, expectedPurpose?: PasswordTokenPurpose) {
    if (locale !== "fr" && locale !== "en") throw new AuthError("Demande invalide.");
    const origin = passwordLinkOrigin(env);
    const token = randomBytes(32).toString("hex");
    const tokenHash = hash(token);
    const issued = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { receivedInvitation: true },
      });
      if (!user?.email || !available(user)) return null;
      const purpose: PasswordTokenPurpose =
        user.receivedInvitation && !user.receivedInvitation.acceptedAt ? "INVITATION" : "RESET";
      if (expectedPurpose && purpose !== expectedPurpose)
        throw new AuthError("Ce compte existe déjà. Il peut utiliser le lien Mot de passe oublié.");
      const data = {
        tokenHash,
        email: user.email,
        purpose,
        expiresAt: new Date(now().getTime() + (purpose === "INVITATION" ? 48 : 1) * 60 * 60 * 1000),
        consumedAt: null,
        deliveryStatus: "PENDING" as const,
        createdAt: now(),
      };
      await tx.passwordToken.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });
      return { email: user.email, purpose };
    });
    if (!issued) return;
    const en = locale === "en";
    const invitation = issued.purpose === "INVITATION";
    // Fragment stays out of HTTP request URLs, access logs and referrers.
    const url = origin + localizePath("/definir-mot-de-passe", locale) + "#token=" + token;
    try {
      await send({
        to: issued.email,
        subject: invitation
          ? en
            ? "Your Connex invitation"
            : "Votre invitation Connex"
          : en
            ? "Reset your Connex password"
            : "Réinitialiser votre mot de passe Connex",
        text: invitation
          ? en
            ? `You are invited to join Connex. Set your password using this link:\n\n${url}\n\nThis link expires in 48 hours. If you were not expecting this invitation, ignore this email.`
            : `Vous êtes invité à rejoindre Connex. Définissez votre mot de passe avec ce lien :\n\n${url}\n\nCe lien expire dans 48 heures. Si vous n’attendiez pas cette invitation, ignorez cet email.`
          : en
            ? `Set a new Connex password using this link:\n\n${url}\n\nThis link expires in one hour. If you did not request it, ignore this email.`
            : `Définissez un nouveau mot de passe Connex avec ce lien :\n\n${url}\n\nCe lien expire dans une heure. Si vous n’avez pas fait cette demande, ignorez cet email.`,
      });
      await db.passwordToken.updateMany({
        where: { userId, tokenHash },
        data: { deliveryStatus: "SENT" },
      });
    } catch {
      await db.passwordToken.updateMany({
        where: { userId, tokenHash },
        data: { deliveryStatus: "FAILED" },
      });
      throw new AuthError("L’envoi du lien est momentanément indisponible.");
    }
  }
  async function validToken(token: unknown, client: PrismaClient | Prisma.TransactionClient = db) {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw invalid();
    const record = await client.passwordToken.findUnique({
      where: { tokenHash: hash(token) },
      include: { user: { include: { roles: true, receivedInvitation: true } } },
    });
    if (
      !record ||
      record.consumedAt ||
      record.deliveryStatus !== "SENT" ||
      record.expiresAt <= now() ||
      record.email !== record.user.email ||
      !available(record.user)
    )
      throw invalid();
    if (
      record.purpose === "INVITATION" &&
      (!record.user.receivedInvitation ||
        record.user.receivedInvitation.acceptedAt ||
        !record.user.roles.some(({ role }) => role === "FOUNDER"))
    )
      throw invalid();
    if (
      record.purpose === "RESET" &&
      record.user.receivedInvitation &&
      !record.user.receivedInvitation.acceptedAt
    )
      throw invalid();
    return record;
  }
  return {
    async requestReset(emailInput: unknown, locale: Locale) {
      const email = typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
      if (await limited("password-link:" + email)) return;
      const user = await db.user.findUnique({
        where: { email },
        select: { id: true, accountStatus: true },
      });
      if (user && available(user)) await issue(user.id, locale);
    },
    async invite(
      adminId: string,
      input: { email: unknown; firstName: unknown; lastName: unknown },
      locale: Locale,
    ) {
      const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
      const firstName = typeof input.firstName === "string" ? input.firstName.trim() : "";
      const lastName = typeof input.lastName === "string" ? input.lastName.trim() : "";
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new AuthError("Saisissez une adresse email valide.");
      if (!firstName || firstName.length > 60 || !lastName || lastName.length > 100)
        throw new AuthError("Renseignez le nom et le prénom.");
      if (locale !== "fr" && locale !== "en") throw new AuthError("Demande invalide.");
      const actor = await db.user.findUnique({ where: { id: adminId }, include: { roles: true } });
      if (
        !actor ||
        !actor.emailVerifiedAt ||
        actor.accountStatus !== "ACTIVE" ||
        !actor.roles.some(({ role }) => role === "ADMIN")
      )
        throw new AuthError("Cette action est réservée aux administrateurs.");
      if (
        (await limited("admin-invite:" + adminId, 20)) ||
        (await limited("password-link:" + email))
      )
        throw new AuthError("Trop de tentatives. Réessayez dans 15 minutes.");
      passwordLinkOrigin(env);
      // An unknown random password prevents login before the recipient accepts the invitation.
      const passwordHash = await hashPassword(randomBytes(48).toString("hex"));
      const invited = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id=${adminId}::uuid FOR UPDATE`;
        const admin = await tx.user.findUnique({
          where: { id: adminId },
          include: { roles: true },
        });
        if (
          !admin ||
          !admin.emailVerifiedAt ||
          admin.accountStatus !== "ACTIVE" ||
          !admin.roles.some(({ role }) => role === "ADMIN")
        )
          throw new AuthError("Cette action est réservée aux administrateurs.");
        const existing = await tx.user.findUnique({
          where: { email },
          include: { receivedInvitation: true, roles: true },
        });
        if (existing) {
          if (
            !available(existing) ||
            !existing.receivedInvitation ||
            existing.receivedInvitation.acceptedAt ||
            !existing.roles.some(({ role }) => role === "FOUNDER")
          )
            throw new AuthError(
              "Ce compte existe déjà. Il peut utiliser le lien Mot de passe oublié.",
            );
          return existing.id;
        }
        return (
          await tx.user.create({
            data: {
              email,
              firstName,
              lastName,
              passwordHash,
              roles: { create: { role: "FOUNDER" } },
              founderProfile: { create: {} },
              receivedInvitation: { create: { invitedById: adminId } },
            },
          })
        ).id;
      });
      await issue(invited, locale, "INVITATION");
    },
    async inspect(token: unknown) {
      const record = await validToken(token);
      return { purpose: record.purpose };
    },
    async setPassword(input: {
      token: unknown;
      password: unknown;
      passwordConfirmation: unknown;
      adultConfirmed?: unknown;
      locale?: Locale;
    }) {
      const record = await validToken(input.token);
      const password = typeof input.password === "string" ? input.password : "";
      if (password.length < 8 || password.length > 128)
        throw new AuthError("Le mot de passe doit contenir entre 8 et 128 caractères.");
      if (password !== input.passwordConfirmation)
        throw new AuthError("Les deux mots de passe doivent être identiques.");
      if (record.purpose === "INVITATION" && input.adultConfirmed !== true)
        throw new AuthError("Vous devez confirmer avoir 18 ans ou plus.");
      const passwordHash = await hashPassword(password);
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id=${record.userId}::uuid FOR UPDATE`;
        const current = await validToken(input.token, tx);
        await tx.user.update({
          where: { id: current.userId },
          data: {
            passwordHash,
            emailVerifiedAt: current.user.emailVerifiedAt ?? now(),
            accountStatus:
              current.user.accountStatus === "PENDING_VERIFICATION"
                ? "ACTIVE"
                : current.user.accountStatus,
          },
        });
        await tx.passwordToken.update({
          where: { userId: current.userId },
          data: { consumedAt: now() },
        });
        if (current.purpose === "INVITATION") {
          await tx.accountInvitation.update({
            where: { userId: current.userId },
            data: { acceptedAt: now() },
          });
          await tx.founderProfile.update({
            where: { userId: current.userId },
            data: { adultConfirmedAt: now() },
          });
        }
        await tx.session.deleteMany({ where: { userId: current.userId } });
        await tx.emailVerification.deleteMany({ where: { userId: current.userId } });
      });
      if (record.purpose === "RESET") {
        const en = input.locale === "en";
        try {
          await send({
            to: record.email,
            subject: en
              ? "Your Connex password was changed"
              : "Votre mot de passe Connex a été modifié",
            text: en
              ? "Your Connex password was changed. If this was not you, contact the Connex team immediately."
              : "Votre mot de passe Connex a été modifié. Si vous n’êtes pas à l’origine de cette modification, contactez immédiatement l’équipe Connex.",
          });
        } catch {
          console.error("Password change notification could not be delivered");
        }
      }
    },
  };
}
