import { getTranslator } from "@/lib/i18n/server";
import { getLocale } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { MentorApplicationForm } from "@/components/mentor-application-form";
import { getAuthenticatedProfile } from "@/lib/onboarding/profile";
import { mentorDestination } from "@/lib/onboarding/mentor-policy";
import { logout } from "@/app/actions/auth";
import "@/app/panel.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return {
    title: t("Votre candidature mentor — CNX"),
    robots: { index: false, follow: false },
  };
}

export default async function MentorApplication() {
  const t = await getTranslator();
  const profile = await getAuthenticatedProfile();
  const destination = mentorDestination(profile);
  if (destination !== "/mentor/candidature")
    redirect(localizePath(destination ?? "/compte", await getLocale()));
  const rejected = profile.mentorStatus === "REJECTED";
  const revoked = profile.mentorStatus === "REVOKED";
  const needsUpdate = ["REJECTED", "REVOKED"].includes(profile.mentorStatus);
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
          <span className="welcome-eyebrow">{t("VOTRE CANDIDATURE MENTOR")}</span>
          <h1 className={needsUpdate ? "mentor-application-rejected" : undefined}>
            {rejected ? (
              <>
                {" "}
                {t("Votre dernière candidature")} <em>{t("a été refusée.")}</em>
              </>
            ) : revoked ? (
              <>
                {" "}
                {t("Votre validation mentor")} <em>{t("a été retirée.")}</em>
              </>
            ) : (
              <>
                {" "}
                {t("Faisons connaissance")} <em>{t("avec votre expérience.")}</em>
              </>
            )}
          </h1>
          <p>
            {needsUpdate
              ? t(
                  "Votre dossier doit être complété. Déposez de nouveaux justificatifs pour permettre à l’équipe CNX de réexaminer votre candidature.",
                )
              : t(
                  "Votre candidature n’est pas encore validée. Envoyez votre CV ou tout document attestant de votre expérience : diplôme, certificat ou attestation professionnelle.",
                )}
          </p>
          <MentorApplicationForm
            resubmission={needsUpdate}
            professionalTitle={profile.mentorProfessionalTitle}
            biography={profile.mentorBiography}
          />
          <p className="certification-privacy">
            {" "}
            {t("Vos documents restent confidentiels et sont examinés par l’équipe CNX.")}{" "}
          </p>
        </section>
      </main>
    </div>
  );
}
