import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { CertificationForm } from "@/components/certification-form";
import { getAuthenticatedProfile } from "@/lib/onboarding/profile";
import { logout } from "@/app/actions/auth";
import "../panel.css";

export const metadata: Metadata = {
  title: "Votre certification — Conex",
  robots: { index: false, follow: false },
};

export default async function Certification() {
  const profile = await getAuthenticatedProfile();
  if (!profile.isFounder || profile.isCertified) redirect("/compte");
  const waiting = ["PENDING", "IN_REVIEW"].includes(profile.certificationStatus);
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
          <span className="welcome-eyebrow">
            BIENVENUE, {profile.firstName.toLocaleUpperCase("fr")}
          </span>
          <h1>
            Confirmez votre parcours <em>WoeAcademy.</em>
          </h1>
          <p>
            Vous n’avez pas encore confirmé votre appartenance à WoeAcademy. Déposez votre
            justificatif de certification Niveau Rouge pour accéder à votre espace.
          </p>
          {waiting ? (
            <div className="auth-feedback" role="status">
              Votre document a bien été reçu. Sa vérification est en cours.
            </div>
          ) : (
            <CertificationForm />
          )}
          <p className="certification-privacy">Votre document reste confidentiel.</p>
        </section>
      </main>
    </div>
  );
}
