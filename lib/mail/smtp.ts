import "server-only";
import nodemailer from "nodemailer";
import { AuthError } from "@/lib/auth/service";
import { verificationEmail } from "./templates";
import type { Locale } from "@/lib/i18n/config";
export type VerificationMessage = { to: string; code: string; locale: Locale };
export async function sendAccountEmail(
  message: { to: string; subject: string; text: string; html?: string },
  env: Partial<NodeJS.ProcessEnv> = process.env,
) {
  const host = env.SMTP_HOST?.trim();
  const port = Number(env.SMTP_PORT || 587);
  const from = env.SMTP_FROM?.trim();
  // A single mailbox, with an optional display name; never accept header line breaks.
  const mailbox =
    from && !/[\r\n]/.test(from) ? /^(?:([^<>]+?)\s*<([^<>\s]+)>|([^<>\s]+))$/.exec(from) : null;
  const fromAddress = mailbox?.[2] ?? mailbox?.[3];
  const fromName = mailbox?.[1]?.trim().replace(/^"(.*)"$/, "$1") || "CNX";
  const secure = env.SMTP_SECURE === "true";
  const requireTLS = env.SMTP_REQUIRE_TLS !== "false";
  if (
    !host ||
    !fromAddress ||
    !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(fromAddress) ||
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
    const info = await transport.sendMail({
      from: { name: fromName, address: fromAddress },
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    if (!info.accepted?.length) throw new Error("RecipientNotAccepted");
  } catch {
    throw new AuthError("L’envoi du code est momentanément indisponible. Réessayez plus tard.");
  } finally {
    transport.close();
  }
}

export async function sendVerificationEmail(
  message: VerificationMessage,
  env: Partial<NodeJS.ProcessEnv> = process.env,
) {
  return sendAccountEmail({ to: message.to, ...verificationEmail(message, env.APP_URL) }, env);
}
