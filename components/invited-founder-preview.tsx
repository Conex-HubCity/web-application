import { Brand } from "@/components/brand";
import { logout } from "@/app/actions/auth";
import { getTranslator } from "@/lib/i18n/server";
export async function InvitedFounderPreview({ firstName }: { firstName: string }) {
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
          <h1>
            {t("Bienvenue,")} {firstName}.
          </h1>
          <p>{t("Votre compte est activé. Votre espace sera disponible prochainement.")}</p>
        </section>
      </main>
    </div>
  );
}
