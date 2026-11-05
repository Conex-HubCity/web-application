import type { Locale } from "@/lib/i18n/config";
import { CONTACT_EMAIL } from "@/lib/contact";

export type AccountEmailContent = { subject: string; text: string; html: string };

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

function webUrl(value: string) {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Invalid email link");
  }
  return url;
}

function logoUrl(origin?: string) {
  if (!origin) return null;
  try {
    const url = webUrl(origin);
    return `${url.origin}/assets/conex/cnx-logo-transparent.png`;
  } catch {
    return null;
  }
}

function layout(options: {
  locale: Locale;
  origin?: string;
  preheader: string;
  label: string;
  title: string;
  introduction: string;
  content: string;
  notice: string;
}) {
  const { locale, preheader, label, title, introduction, content, notice } = options;
  const en = locale === "en";
  const logo = logoUrl(options.origin);
  const brand = logo
    ? `<img src="${escapeHtml(logo)}" width="128" height="64" alt="CNX" style="display:block;width:128px;height:64px;object-fit:contain;border:0;" />`
    : '<span style="font-family:Georgia,serif;font-size:42px;line-height:1;color:#fffdf7;">CNX<span style="color:#f0bf7d;">.</span></span>';
  return `<!doctype html>
<html lang="${locale}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="format-detection" content="telephone=no" /><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background-color:#f6f3eb;color:#132d26;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f6f3eb">
    <tr><td align="center" style="padding:32px 12px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border:1px solid #e2e3da;border-radius:18px;overflow:hidden;background-color:#fffdf7;">
        <tr><td bgcolor="#132d26" style="padding:28px 28px 24px;border-radius:18px 18px 0 0;">
          ${brand}
          <p style="margin:14px 0 0;color:#f0bf7d;font-family:Georgia,serif;font-size:17px;line-height:1.5;font-style:italic;">${en ? "Connect to build." : "Relier pour construire."}</p>
        </td></tr>
        <tr><td style="padding:32px 28px;">
          <p style="margin:0 0 14px;color:#657568;font-size:10px;line-height:1.6;font-weight:bold;letter-spacing:1.8px;">${escapeHtml(label)}</p>
          <h1 style="margin:0 0 20px;color:#132d26;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;font-weight:normal;">${escapeHtml(title)}</h1>
          <p style="margin:0 0 24px;color:#526557;font-size:15px;line-height:1.8;">${escapeHtml(introduction)}</p>
          ${content}
          <p style="margin:26px 0 0;border-top:1px solid #e2e3da;padding-top:20px;color:#657568;font-size:12px;line-height:1.8;">${escapeHtml(notice)}</p>
        </td></tr>
        <tr><td bgcolor="#eeece4" style="padding:22px 28px;border-radius:0 0 18px 18px;">
          <p style="margin:0;color:#132d26;font-size:12px;line-height:1.7;">${en ? "The CNX team" : "L’équipe CNX"}</p>
          <p style="margin:5px 0 0;font-size:12px;line-height:1.7;"><a href="mailto:${CONTACT_EMAIL}" style="color:#214137;text-decoration:underline;">${CONTACT_EMAIL}</a></p>
          <p style="margin:14px 0 0;color:#657568;font-size:10px;line-height:1.6;">CNX · A solution by HubCity</p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body></html>`;
}

export function verificationEmail(
  message: { code: string; locale: Locale },
  origin?: string,
): AccountEmailContent {
  const en = message.locale === "en";
  return {
    subject: en ? "Your CNX verification code" : "Votre code de vérification CNX",
    text: en
      ? `Your CNX verification code: ${message.code}\n\nThis code expires in 10 minutes. Do not share it. If you did not request this code, you can ignore this email.`
      : `Votre code de vérification CNX : ${message.code}\n\nCe code expire dans 10 minutes. Ne le partagez pas. Si vous n’avez pas demandé ce code, vous pouvez ignorer cet email.`,
    html: layout({
      locale: message.locale,
      origin,
      preheader: en
        ? "Confirm your email address. Your code is valid for 10 minutes."
        : "Confirmez votre adresse email. Votre code est valable 10 minutes.",
      label: en ? "EMAIL VERIFICATION" : "VÉRIFICATION EMAIL",
      title: en ? "Confirm your email address." : "Confirmez votre adresse email.",
      introduction: en
        ? "To confirm your CNX email address, enter this code on the verification page."
        : "Pour confirmer votre adresse email sur CNX, saisissez ce code sur la page de vérification.",
      content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#e4eadd" style="padding:24px 12px;border:1px solid #d3ddce;border-radius:12px;"><p style="margin:0;color:#132d26;font-family:'Courier New',monospace;font-size:32px;line-height:1.5;letter-spacing:6px;font-weight:bold;">${escapeHtml(message.code)}</p></td></tr></table>
        <p style="margin:16px 0 0;color:#526557;font-size:13px;line-height:1.7;">${en ? "Valid for <strong>10 minutes</strong>. Never share this code." : "Valable <strong>10 minutes</strong>. Ne partagez jamais ce code."}</p>`,
      notice: en
        ? "If you did not request this code, you can ignore this email."
        : "Si vous n’avez pas demandé ce code, vous pouvez ignorer cet email.",
    }),
  };
}

export function passwordLinkEmail(message: {
  url: string;
  locale: Locale;
  purpose: "RESET" | "INVITATION";
}): AccountEmailContent {
  const url = webUrl(message.url);
  const en = message.locale === "en";
  const invitation = message.purpose === "INVITATION";
  const subject = invitation
    ? en
      ? "Your CNX invitation"
      : "Votre invitation CNX"
    : en
      ? "Reset your CNX password"
      : "Réinitialiser votre mot de passe CNX";
  const expiry = invitation
    ? en
      ? "This link expires in 48 hours."
      : "Ce lien expire dans 48 heures."
    : en
      ? "This link expires in one hour."
      : "Ce lien expire dans une heure.";
  const notice = invitation
    ? en
      ? "If you were not expecting this invitation, ignore this email."
      : "Si vous n’attendiez pas cette invitation, ignorez cet email."
    : en
      ? "If you did not request it, ignore this email."
      : "Si vous n’avez pas fait cette demande, ignorez cet email.";
  const introduction = invitation
    ? en
      ? "You are invited to join CNX. Set your password using this link:"
      : "Vous êtes invité à rejoindre CNX. Définissez votre mot de passe avec ce lien :"
    : en
      ? "Set a new CNX password using this link:"
      : "Définissez un nouveau mot de passe CNX avec ce lien :";
  const action = invitation
    ? en
      ? "Set my password"
      : "Définir mon mot de passe"
    : en
      ? "Reset my password"
      : "Réinitialiser mon mot de passe";
  return {
    subject,
    text: `${introduction}\n\n${message.url}\n\n${expiry} ${notice}`,
    html: layout({
      locale: message.locale,
      origin: url.origin,
      preheader: `${action}. ${expiry}`,
      label: invitation
        ? en
          ? "YOUR INVITATION"
          : "VOTRE INVITATION"
        : en
          ? "ACCOUNT SECURITY"
          : "SÉCURITÉ DU COMPTE",
      title: invitation
        ? en
          ? "Welcome to CNX."
          : "Bienvenue sur CNX."
        : en
          ? "A new password."
          : "Un nouveau mot de passe.",
      introduction,
      content: `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#f0bf7d" style="border:1px solid #f0bf7d;border-radius:8px;mso-padding-alt:16px 20px;"><a href="${escapeHtml(message.url)}" style="display:inline-block;padding:16px 20px;border:1px solid #f0bf7d;border-radius:8px;color:#132d26;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;font-weight:bold;text-align:center;text-decoration:none;">${action}</a></td></tr></table>
        <p style="margin:20px 0 0;color:#526557;font-size:13px;line-height:1.7;">${expiry}</p>
        <p style="margin:22px 0 8px;color:#657568;font-size:12px;line-height:1.8;">${en ? "If the button does not work, copy this link into your browser:" : "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :"}</p>
        <p style="margin:0;font-size:11px;line-height:1.8;word-break:break-all;overflow-wrap:anywhere;"><a href="${escapeHtml(message.url)}" style="color:#214137;text-decoration:underline;word-break:break-all;overflow-wrap:anywhere;">${escapeHtml(message.url)}</a></p>`,
      notice,
    }),
  };
}
