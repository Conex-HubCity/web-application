import { getTranslator } from "@/lib/i18n/server";
import { getLocale } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icon";
import { getAuthenticatedProfile } from "@/lib/onboarding/profile";
import { mentorDestination } from "@/lib/onboarding/mentor-policy";
import { logout } from "@/app/actions/auth";
import { refreshMentorStatus } from "@/app/actions/mentor";
import "@/app/panel.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return {
    title: t("Candidature en cours de validation — CNX"),
    robots: { index: false, follow: false },
  };
}

export default async function MentorValidation() {
  const t = await getTranslator();
  const profile = await getAuthenticatedProfile();
  const destination = mentorDestination(profile);
  if (destination !== "/mentor/validation")
    redirect(localizePath(destination ?? "/compte", await getLocale()));
  return (
    <div className="auth-page">
      <header className="welcome-header welcome-container">
        <Brand />
        <form action={logout}>
          <button className="panel-logout" type="submit">
            {" "}
            {t("Se déconnecter")}{" "}
          </button>
        </form>
      </header>
      <main className="welcome-container certification-main">
        <section className="certification-card">
          <div className="mentor-status-icon">
            <Icon name="check" size={24} />
          </div>
          <span className="welcome-eyebrow">{t("DOSSIER REÇU")}</span>
          <h1>
            {" "}
            {t("Votre candidature est")} <em>{t("en cours de validation.")}</em>
          </h1>
          <p>
            {" "}
            {t("Merci,")} {profile.firstName}
            {t(
              ". L’équipe CNX examine votre expérience et les justificatifs transmis. Vous pourrez accéder à votre tableau de bord une fois votre candidature validée.",
            )}{" "}
          </p>
          <ul className="mentor-proof-list" aria-label={t("Documents transmis")}>
            {profile.mentorDocuments.map((document) => (
              <li key={document.id}>
                <Icon name="document" size={18} />
                <span>{document.originalFilename}</span>
                <small>{document.documentType === "CV" ? "CV" : t("Justificatif")}</small>
              </li>
            ))}
          </ul>
          <form action={refreshMentorStatus}>
            <button className="auth-submit" type="submit">
              {" "}
              {t("Vérifier le statut")}{" "}
            </button>
          </form>
          <p className="certification-privacy">{t("Vos documents restent confidentiels.")}</p>
        </section>
      </main>
    </div>
  );
}
