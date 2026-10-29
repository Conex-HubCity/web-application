import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { EmailVerificationForm } from "@/components/email-verification-form";
import { getCurrentUser } from "@/lib/auth/session";
import { createEmailVerificationService } from "@/lib/auth/email-verification";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { logout } from "@/app/actions/auth";
import "@/app/panel.css";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("Confirmer mon email — CNX"), robots: { index: false, follow: false } };
}
export default async function EmailVerification() {
  const user = await getCurrentUser({ allowUnverified: true });
  const locale = await getLocale();
  if (!user) redirect(localizePath("/connexion", locale));
  if (user.emailVerifiedAt) redirect(localizePath("/compte", locale));
  const status = await createEmailVerificationService().status(user.id);
  const t = await getTranslator();
  return (
    <div className="auth-page">
      <header className="welcome-header welcome-container">
        <Brand />
        <form action={logout}>
          <button className="panel-logout" type="submit">
            {t("Se déconnecter")}
          </button>
        </form>
      </header>
      <main className="welcome-container certification-main">
        <section className="certification-card">
          <span className="welcome-eyebrow">{t("VÉRIFICATION EMAIL")}</span>
          <h1>
            {t("Confirmez votre")} <em>{t("adresse email.")}</em>
          </h1>
          <p>
            {t(
              status.sent
                ? "Saisissez le code envoyé à cette adresse :"
                : "Recevez un code pour confirmer cette adresse :",
            )}{" "}
            <strong>{status.email}</strong>
          </p>
          {status.failed && (
            <p className="auth-error" role="alert">
              {t("L’envoi du code est momentanément indisponible. Réessayez plus tard.")}
            </p>
          )}
          <EmailVerificationForm sent={Boolean(status.sent)} />
        </section>
      </main>
    </div>
  );
}
