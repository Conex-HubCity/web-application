import { Brand } from "./brand";
import { Icon } from "./icon";
import { logout } from "@/app/actions/auth";
import { getTranslator } from "@/lib/i18n/server";

export async function MentorPreview({ firstName }: { firstName: string }) {
  const t = await getTranslator();
  return (
    <div className="auth-page mentor-preview-page">
      <header className="welcome-header welcome-container">
        <Brand />
        <form action={logout}>
          <button type="submit" className="panel-logout">
            {t("Se déconnecter")}
          </button>
        </form>
      </header>
      <main className="welcome-container certification-main">
        <section className="certification-card mentor-preview-card">
          <div className="mentor-status-icon">
            <Icon name="check" size={24} />
          </div>
          <span className="welcome-eyebrow">{t("CANDIDATURE ACCEPTÉE")}</span>
          <h1>
            {t("Vous faites partie")} <em>{t("de l’aventure.")}</em>
          </h1>
          <p>
            {t("Merci,")} {firstName}. {t("Votre compte mentor a été validé.")}
          </p>
          <div className="mentor-preview-notice">
            <Icon name="compass" size={25} />
            <div>
              <h2>{t("La plateforme est en cours de développement.")}</h2>
              <p>
                {t(
                  "Votre espace mentor sera disponible prochainement. Nous vous informerons par email dès son ouverture.",
                )}
              </p>
            </div>
          </div>
          <p className="certification-privacy">
            {t(
              "Votre candidature et vos justificatifs sont bien conservés. Vous n’avez aucune autre démarche à effectuer pour le moment.",
            )}
          </p>
        </section>
      </main>
    </div>
  );
}
