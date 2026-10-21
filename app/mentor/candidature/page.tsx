import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { MentorApplicationForm } from "@/components/mentor-application-form";
import { getAuthenticatedProfile } from "@/lib/onboarding/profile";
import { mentorDestination } from "@/lib/onboarding/mentor-policy";
import { logout } from "@/app/actions/auth";
import "../../panel.css";

export const metadata: Metadata = {
  title: "Votre candidature mentor — Conex",
  robots: { index: false, follow: false },
};

export default async function MentorApplication() {
  const profile = await getAuthenticatedProfile();
  const destination = mentorDestination(profile);
  if (destination !== "/mentor/candidature") redirect(destination ?? "/compte");
  const needsUpdate = ["REJECTED", "REVOKED"].includes(profile.mentorStatus);
  return (
    <div className="auth-page">
      <header className="welcome-header welcome-container">
        <Brand />
        <form action={logout}>
          <button className="panel-logout" type="submit">
            Se déconnecter
          </button>
        </form>
      </header>
      <main className="welcome-container certification-main">
        <section className="certification-card">
          <span className="welcome-eyebrow">VOTRE CANDIDATURE MENTOR</span>
          <h1>
            Faisons connaissance <em>avec votre expérience.</em>
          </h1>
          <p>
            {needsUpdate
              ? "Votre dossier doit être complété. Déposez de nouveaux justificatifs pour permettre à l’équipe Conex de réexaminer votre candidature."
              : "Votre candidature n’est pas encore validée. Envoyez votre CV ou tout document attestant de votre expérience : diplôme, certificat ou attestation professionnelle."}
          </p>
          <MentorApplicationForm
            professionalTitle={profile.mentorProfessionalTitle}
            biography={profile.mentorBiography}
          />
          <p className="certification-privacy">
            Vos documents restent confidentiels et sont examinés par l’équipe Conex.
          </p>
        </section>
      </main>
    </div>
  );
}
