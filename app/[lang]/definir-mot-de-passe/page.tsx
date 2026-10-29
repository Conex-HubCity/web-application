import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { Link } from "@/components/i18n";
import { DefinePasswordForm } from "@/components/password-forms";
import { getTranslator } from "@/lib/i18n/server";
import "@/app/panel.css";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return {
    title: t("Définir mon mot de passe"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}
export default async function PasswordPage() {
  const t = await getTranslator();
  return (
    <div className="auth-page">
      <header className="welcome-header welcome-container">
        <Brand />
        <Link className="auth-back" href="/connexion">
          {t("Se connecter")}
        </Link>
      </header>
      <main className="welcome-container certification-main">
        <section className="certification-card">
          <h1>{t("Définir mon mot de passe")}</h1>
          <DefinePasswordForm />
        </section>
      </main>
    </div>
  );
}
