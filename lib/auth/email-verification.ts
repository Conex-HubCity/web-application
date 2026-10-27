import "server-only";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { AuthError, sessionData } from "./service";
import { sendVerificationEmail, type VerificationMessage } from "@/lib/mail/smtp";
import type { Locale } from "@/lib/i18n/config";
const TTL = 10 * 60 * 1000;
const WINDOW = 15 * 60 * 1000;
const COOLDOWN = 60 * 1000;
export function createEmailVerificationService(
  db: PrismaClient = getDb(),
  options: {
    secret?: string;
    send?: (message: VerificationMessage) => Promise<void>;
    now?: () => Date;
  } = {},
) {
  const now = options.now ?? (() => new Date());
  const send = options.send ?? sendVerificationEmail;
  function digest(id: string, userId: string, email: string, code: string) {
    const secret = options.secret ?? process.env.EMAIL_OTP_SECRET;
    if (!secret || secret.length < 32 || secret.startsWith("CHANGE_ME"))
      throw new AuthError("L’envoi du code est momentanément indisponible. Réessayez plus tard.");
    return createHmac("sha256", secret).update(`${id}:${userId}:${email}:${code}`).digest("hex");
  }
  return {
    async status(userId: string) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          emailVerifiedAt: true,
          emailVerification: {
            select: { deliveryStatus: true, expiresAt: true, consumedAt: true },
          },
        },
      });
      if (!user?.email) throw new AuthError("Compte indisponible.");
      return {
        email: user.email,
        verified: Boolean(user.emailVerifiedAt),
        sent:
          user.emailVerification?.deliveryStatus === "SENT" && !user.emailVerification.consumedAt,
        failed: user.emailVerification?.deliveryStatus === "FAILED",
      };
    },
    async issue(userId: string, locale: Locale) {
      const timestamp = now();
      const code = String(randomInt(1000000)).padStart(6, "0");
      const id = randomUUID();
      const result = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`;
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: { emailVerification: true },
        });
        if (!user?.email || ["SUSPENDED", "CLOSED"].includes(user.accountStatus))
          throw new AuthError("Compte indisponible.");
        if (user.emailVerifiedAt) return null;
        const previous = user.emailVerification;
        const sameWindow =
          previous && timestamp.getTime() - previous.windowStartedAt.getTime() < WINDOW;
        if (previous && timestamp.getTime() - previous.lastSentAt.getTime() < COOLDOWN)
          throw new AuthError("Patientez une minute avant de demander un nouveau code.");
        if (sameWindow && (previous.sendCount >= 5 || previous.attempts >= 5))
          throw new AuthError("Trop de tentatives. Réessayez dans 15 minutes.");
        const data = {
          id,
          email: user.email,
          codeHash: digest(id, userId, user.email, code),
          expiresAt: new Date(timestamp.getTime() + TTL),
          attempts: sameWindow ? previous.attempts : 0,
          sendCount: sameWindow ? previous.sendCount + 1 : 1,
          windowStartedAt: sameWindow ? previous.windowStartedAt : timestamp,
          lastSentAt: timestamp,
          deliveryStatus: "PENDING" as const,
          consumedAt: null,
        };
        await tx.emailVerification.upsert({
          where: { userId },
          create: { ...data, userId },
          update: data,
        });
        return { to: user.email };
      });
      if (!result) return false;
      try {
        await send({ to: result.to, code, locale });
        await db.emailVerification.updateMany({
          where: { userId, id, deliveryStatus: "PENDING" },
          data: { deliveryStatus: "SENT" },
        });
        return true;
      } catch {
        await db.emailVerification.updateMany({
          where: { userId, id },
          data: { deliveryStatus: "FAILED" },
        });
        throw new AuthError("L’envoi du code est momentanément indisponible. Réessayez plus tard.");
      }
    },
    async verify(userId: string, input: unknown) {
      const code = typeof input === "string" ? input.trim() : "";
      if (!/^\d{6}$/.test(code))
        throw new AuthError("Saisissez le code à 6 chiffres reçu par email.");
      const timestamp = now();
      const result = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`;
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: { emailVerification: true },
        });
        const record = user?.emailVerification;
        if (!user?.email || ["SUSPENDED", "CLOSED"].includes(user.accountStatus))
          return { error: "Compte indisponible." };
        if (
          user.emailVerifiedAt ||
          !record ||
          record.consumedAt ||
          record.email !== user.email ||
          record.deliveryStatus !== "SENT"
        )
          return { error: "Code invalide ou expiré. Demandez un nouveau code." };
        if (record.attempts >= 5)
          return { error: "Trop de tentatives. Réessayez dans 15 minutes." };
        if (record.expiresAt <= timestamp)
          return { error: "Code invalide ou expiré. Demandez un nouveau code." };
        const actual = digest(record.id, userId, user.email, code);
        if (!timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(record.codeHash, "hex"))) {
          await tx.emailVerification.update({
            where: { userId },
            data: { attempts: { increment: 1 } },
          });
          return { error: "Code invalide ou expiré. Demandez un nouveau code." };
        }
        await tx.user.update({
          where: { id: userId },
          data: {
            emailVerifiedAt: timestamp,
            ...(user.accountStatus === "PENDING_VERIFICATION" ? { accountStatus: "ACTIVE" } : {}),
          },
        });
        await tx.emailVerification.update({ where: { userId }, data: { consumedAt: timestamp } });
        await tx.session.deleteMany({ where: { userId } });
        const session = sessionData();
        await tx.session.create({
          data: { userId, tokenHash: session.tokenHash, expiresAt: session.expiresAt },
        });
        return { session: { token: session.token, expiresAt: session.expiresAt } };
      });
      if (result.error) throw new AuthError(result.error);
      return result.session!;
    },
  };
}
