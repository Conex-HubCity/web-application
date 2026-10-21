import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icon";
import { getAuthenticatedProfile } from "@/lib/onboarding/profile";
import { logout } from "@/app/actions/auth";
import "../panel.css";

export const metadata: Metadata = {
  title: "Mon compte — Conex",
  robots: { index: false, follow: false },
};
const labels = { FOUNDER: "porteur de projet", MENTOR: "mentor", ADMIN: "administrateur" };

export default async function Account() {
  const profile = await getAuthenticatedProfile();
  if (profile.isFounder && !profile.isCertified) redirect("/certification");
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
            Se déconnecter
          </button>
        </form>
      </header>
      <main className="panel-main">
        <span className="welcome-eyebrow">MON ESPACE / VUE D’ENSEMBLE</span>
        <section className="panel-welcome">
          <div>
            <h1>
              Bienvenue, <em>{profile.firstName}.</em>
            </h1>
            <p>
              Vous êtes connecté en tant que{" "}
              <strong>{profile.roles.map((role) => labels[role]).join(" et ") || "membre"}</strong>.
            </p>
          </div>
          {profile.isCertified && (
            <span className="panel-certified">
              <Icon name="check" size={16} /> Certification WoeAcademy confirmée
            </span>
          )}
        </section>
        {profile.isFounder ? (
          <>
            <section className="panel-project">
              <div className="panel-project-copy">
                <span className="welcome-eyebrow">LA SUITE DE VOTRE PARCOURS</span>
                <h2>
                  {profile.project
                    ? profile.project.title
                    : "Donnons une direction à votre projet."}
                </h2>
                <p>
                  {profile.project
                    ? "Retrouvez ici l’avancement de votre projet et les prochaines étapes de votre accompagnement."
                    : "Votre appartenance à WoeAcademy est confirmée. La prochaine étape sera de présenter votre projet et vos besoins d’accompagnement."}
                </p>
              </div>
              <div className="panel-project-symbol" aria-hidden="true">
                <Icon name="compass" size={72} />
              </div>
            </section>
            <section className="panel-steps" aria-label="Votre parcours">
              <article>
                <span className="panel-step-number complete">
                  <Icon name="check" size={18} />
                </span>
                <div>
                  <span className="panel-step-state">CONFIRMÉE</span>
                  <h2>Votre certification</h2>
                  <p>Votre justificatif WoeAcademy a été accepté.</p>
                </div>
              </article>
              <article>
                <span className="panel-step-number">02</span>
                <div>
                  <span className="panel-step-state">PROCHAINE ÉTAPE</span>
                  <h2>Votre projet</h2>
                  <p>Présentez votre idée, vos objectifs et les besoins qui vous font avancer.</p>
                </div>
              </article>
              <article>
                <span className="panel-step-number">03</span>
                <div>
                  <span className="panel-step-state">À VENIR</span>
                  <h2>Les bonnes rencontres</h2>
                  <p>Après validation du projet, Conex accompagne votre mise en relation.</p>
                </div>
              </article>
            </section>
          </>
        ) : (
          <section className="panel-project">
            <div className="panel-project-copy">
              <span className="welcome-eyebrow">VOTRE PARCOURS</span>
              <h2>Votre expérience ouvre de nouveaux horizons.</h2>
              <p>
                Bienvenue dans votre espace Conex. Votre candidature et votre expertise feront
                l’objet d’une vérification avant les mises en relation.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
