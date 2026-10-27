import "server-only";
import nodemailer from "nodemailer";
import { AuthError } from "@/lib/auth/service";
import type { Locale } from "@/lib/i18n/config";
export type VerificationMessage = { to: string; code: string; locale: Locale };
export async function sendVerificationEmail(
  message: VerificationMessage,
  env: Partial<NodeJS.ProcessEnv> = process.env,
) {
  const host = env.SMTP_HOST?.trim();
  const port = Number(env.SMTP_PORT || 587);
  const from = env.SMTP_FROM?.trim();
  const secure = env.SMTP_SECURE === "true";
  const requireTLS = env.SMTP_REQUIRE_TLS !== "false";
  if (
    !host ||
    !from ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASSWORD) ||
    (!secure && !requireTLS && env.NODE_ENV === "production")
  )
    throw new AuthError("L’envoi du code est momentanément indisponible. Réessayez plus tard.");
  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure && requireTLS,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });
  try {
    const en = message.locale === "en";
    const info = await transport.sendMail({
      from: { name: "Connex", address: from },
      to: message.to,
      subject: en ? "Your Connex verification code" : "Votre code de vérification Connex",
      text: en
        ? `Your Connex verification code: ${message.code}\n\nThis code expires in 10 minutes. Do not share it. If you did not request this code, you can ignore this email.`
        : `Votre code de vérification Connex : ${message.code}\n\nCe code expire dans 10 minutes. Ne le partagez pas. Si vous n’avez pas demandé ce code, vous pouvez ignorer cet email.`,
    });
    if (!info.accepted?.length) throw new Error("RecipientNotAccepted");
  } catch {
    throw new AuthError("L’envoi du code est momentanément indisponible. Réessayez plus tard.");
  } finally {
    transport.close();
  }
}
