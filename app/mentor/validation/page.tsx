import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icon";
import { getAuthenticatedProfile } from "@/lib/onboarding/profile";
import { mentorDestination } from "@/lib/onboarding/mentor-policy";
import { logout } from "@/app/actions/auth";
import { refreshMentorStatus } from "@/app/actions/mentor";
import "../../panel.css";

export const metadata: Metadata = {
  title: "Candidature en cours de validation — Conex",
  robots: { index: false, follow: false },
};

export default async function MentorValidation() {
  const profile = await getAuthenticatedProfile();
  const destination = mentorDestination(profile);
  if (destination !== "/mentor/validation") redirect(destination ?? "/compte");
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
          <div className="mentor-status-icon">
            <Icon name="check" size={24} />
          </div>
          <span className="welcome-eyebrow">DOSSIER REÇU</span>
          <h1>
            Votre candidature est <em>en cours de validation.</em>
          </h1>
          <p>
            Merci, {profile.firstName}. L’équipe Conex examine votre expérience et les justificatifs
            transmis. Vous pourrez accéder à votre tableau de bord une fois votre candidature
            validée.
          </p>
          <ul className="mentor-proof-list" aria-label="Documents transmis">
            {profile.mentorDocuments.map((document) => (
              <li key={document.id}>
                <Icon name="document" size={18} />
                <span>{document.originalFilename}</span>
                <small>{document.documentType === "CV" ? "CV" : "Justificatif"}</small>
              </li>
            ))}
          </ul>
          <form action={refreshMentorStatus}>
            <button className="auth-submit" type="submit">
              Vérifier le statut
            </button>
          </form>
          <p className="certification-privacy">Vos documents restent confidentiels.</p>
        </section>
      </main>
    </div>
  );
}
