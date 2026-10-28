import { isMentorPreviewEnabled } from "@/lib/release";
import { MentorPreview } from "@/components/mentor-preview";
import { getTranslator } from "@/lib/i18n/server";
import { getLocale } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icon";
import { getAuthenticatedProfile } from "@/lib/onboarding/profile";
import { logout } from "@/app/actions/auth";
import { mentorDestination } from "@/lib/onboarding/mentor-policy";
import "@/app/panel.css";
import "@/app/mentor-dashboard.css";
import { MentorDashboard } from "@/components/mentor-dashboard";
import { getMentorDashboard } from "@/lib/domain/mentor-dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return {
    title: t("Mon compte — Connex"),
    robots: { index: false, follow: false },
  };
}
const labels = { FOUNDER: "porteur de projet", MENTOR: "mentor", ADMIN: "administrateur" };

export default async function Account() {
  const t = await getTranslator();
  const profile = await getAuthenticatedProfile();
  if (profile.roles.includes("ADMIN")) redirect(localizePath("/admin", await getLocale()));
  if (
    profile.isMentor &&
    profile.hasContribution &&
    profile.mentorStatus === "DRAFT" &&
    profile.mentorDocuments.length === 0
  )
    redirect(localizePath("/contribution", await getLocale()));
  const mentorRedirect = mentorDestination(profile);
  if (mentorRedirect) redirect(localizePath(mentorRedirect, await getLocale()));
  if (isMentorPreviewEnabled()) {
    if (profile.isMentor && profile.isMentorApproved)
      return <MentorPreview firstName={profile.firstName} />;
    redirect(localizePath("/", await getLocale()));
  }
  if (profile.isFounder && !profile.isCertified)
    redirect(localizePath("/certification", await getLocale()));
  if (profile.isMentor) {
    const dashboard = await getMentorDashboard(profile.id);
    if (!dashboard) redirect(localizePath("/mentor/validation", await getLocale()));
    return <MentorDashboard data={dashboard} />;
  }
  return (
    <div className="panel-page">
      <header className="panel-header">
        <Brand />
        <div className="panel-identity">
          <span className="panel-avatar" aria-hidden="true">
            {profile.firstName.slice(0, 1)}
          </span>
          <span>
            {profile.firstName} {profile.lastName}
          </span>
        </div>
        <form action={logout}>
          <button type="submit" className="panel-logout">
            {" "}
            {t("Se déconnecter")}{" "}
          </button>
        </form>
      </header>
      <main className="panel-main">
        <span className="welcome-eyebrow">{t("MON ESPACE / VUE D’ENSEMBLE")}</span>
        <section className="panel-welcome">
          <div>
            <h1>
              {" "}
              {t("Bienvenue,")} <em>{profile.firstName}.</em>
            </h1>
            <p>
              {" "}
              {t("Vous êtes connecté en tant que")}{" "}
              <strong>
                {profile.roles.map((role) => t(labels[role])).join(t(" et ")) || t("membre")}
              </strong>
              .
            </p>
          </div>
          {profile.isCertified && (
            <span className="panel-certified">
              <Icon name="check" size={16} /> {t("Certification WoeAcademy confirmée")}{" "}
            </span>
          )}
        </section>
        {profile.isFounder ? (
          <>
            <section className="panel-project">
              <div className="panel-project-copy">
                <span className="welcome-eyebrow">{t("LA SUITE DE VOTRE PARCOURS")}</span>
                <h2>
                  {profile.project
                    ? profile.project.title
                    : t("Donnons une direction à votre projet.")}
                </h2>
                <p>
                  {profile.project
                    ? t(
                        "Retrouvez ici l’avancement de votre projet et les prochaines étapes de votre accompagnement.",
                      )
                    : t(
                        "Votre appartenance à WoeAcademy est confirmée. La prochaine étape sera de présenter votre projet et vos besoins d’accompagnement.",
                      )}
                </p>
              </div>
              <div className="panel-project-symbol" aria-hidden="true">
                <Icon name="compass" size={72} />
              </div>
            </section>
            <section className="panel-steps" aria-label={t("Votre parcours")}>
              <article>
                <span className="panel-step-number complete">
                  <Icon name="check" size={18} />
                </span>
                <div>
                  <span className="panel-step-state">{t("CONFIRMÉE")}</span>
                  <h2>{t("Votre certification")}</h2>
                  <p>{t("Votre justificatif WoeAcademy a été accepté.")}</p>
                </div>
              </article>
              <article>
                <span className="panel-step-number">02</span>
                <div>
                  <span className="panel-step-state">{t("PROCHAINE ÉTAPE")}</span>
                  <h2>{t("Votre projet")}</h2>
                  <p>
                    {t("Présentez votre idée, vos objectifs et les besoins qui vous font avancer.")}
                  </p>
                </div>
              </article>
              <article>
                <span className="panel-step-number">03</span>
                <div>
                  <span className="panel-step-state">{t("À VENIR")}</span>
                  <h2>{t("Les bonnes rencontres")}</h2>
                  <p>
                    {t("Après validation du projet, Connex accompagne votre mise en relation.")}
                  </p>
                </div>
              </article>
            </section>
          </>
        ) : (
          <section className="panel-project">
            <div className="panel-project-copy">
              <span className="welcome-eyebrow">{t("VOTRE PARCOURS")}</span>
              <h2>{t("Votre expérience ouvre de nouveaux horizons.")}</h2>
              <p>
                {" "}
                {t(
                  "Votre candidature a été validée. Retrouvez ici la suite de votre parcours mentor et vos prochaines étapes avec Connex.",
                )}{" "}
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
