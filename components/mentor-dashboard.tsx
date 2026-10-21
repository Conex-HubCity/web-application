"use client";

import { useState } from "react";
import { Brand } from "./brand";
import { Icon } from "./icon";
import { logout } from "@/app/actions/auth";
import type { MentorDashboardData } from "@/lib/domain/mentor-dashboard";

const navigation = [
  { id: "overview", label: "Vue d’ensemble", icon: "home", mobile: "Accueil" },
  { id: "projects", label: "Projets à découvrir", icon: "compass", mobile: "Projets" },
  { id: "requests", label: "Mes demandes", icon: "message", mobile: "Demandes" },
  { id: "mentorships", label: "Mes accompagnements", icon: "people", mobile: "Accompagnements" },
  { id: "profile", label: "Mon profil", icon: "user", mobile: "Profil" },
  { id: "membership", label: "Mon adhésion", icon: "wallet", mobile: "Adhésion" },
] as const;
type View = (typeof navigation)[number]["id"];
const requestLabels: Record<string, string> = {
  PENDING_REVIEW: "Examen par Conex",
  REJECTED: "Demande non retenue",
  INVITED: "Rencontre à organiser",
  INTRO_SCHEDULED: "Rencontre programmée",
  AWAITING_CONSENT: "Accords attendus",
  ACCEPTED: "Accords confirmés",
  DECLINED: "Demande déclinée",
  CANCELLED: "Demande annulée",
  EXPIRED: "Demande expirée",
};
const documentLabels: Record<string, string> = {
  APPROVED: "Accepté",
  PENDING: "En attente",
  IN_REVIEW: "En cours d’examen",
  REJECTED: "À compléter",
  REVOKED: "À réexaminer",
  DRAFT: "Brouillon",
};
const date = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(value));

function EmptyState({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="md-empty">
      <div className="md-empty-art">
        <Icon name={icon} size={30} />
        <span />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function MentorDashboard({ data }: { data: MentorDashboardData }) {
  const [view, setView] = useState<View>("overview");
  const firstName = data.firstName.charAt(0).toLocaleUpperCase("fr") + data.firstName.slice(1);
  const initials = (data.firstName.charAt(0) + (data.lastName?.charAt(0) ?? "")).toUpperCase();
  const activeLabel = navigation.find((item) => item.id === view)!.label;
  function go(next: View) {
    setView(next);
    window.scrollTo(0, 0);
  }
  const action = (next: View, text: string, primary = false) => (
    <button
      type="button"
      className={primary ? "md-primary" : "md-text-action"}
      onClick={() => go(next)}
    >
      {text}
      <Icon name="arrow" size={17} />
    </button>
  );
  const membershipLabel = data.membershipActive
    ? "Active"
    : data.membership?.status === "EXPIRED"
      ? "À renouveler"
      : data.membership?.status === "SUSPENDED"
        ? "Suspendue"
        : data.membership?.status === "CANCELLED"
          ? "Résiliée"
          : "À activer";

  return (
    <div className="mentor-shell">
      <a href="#mentor-main" className="skip-link">
        Aller au contenu
      </a>
      <aside className="md-sidebar">
        <Brand />
        <div className="md-workspace-label">
          <span /> ESPACE MENTOR
        </div>
        <span className="md-nav-label">MON PARCOURS</span>
        <nav aria-label="Navigation mentor">
          {navigation.map((item) => (
            <button
              type="button"
              key={item.id}
              data-view={item.id}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => go(item.id)}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              {item.id === "membership" && !data.membershipActive && (
                <i aria-label="Adhésion à activer" />
              )}
            </button>
          ))}
        </nav>
        <div className="md-sidebar-bottom">
          <div className="md-sidebar-note">
            <Icon name="leaf" size={24} />
            <p>
              Le lien
              <br />
              <em>nous élève.</em>
            </p>
            <span>
              Un regard partagé.
              <br />
              De nouveaux possibles.
            </span>
          </div>
          <button type="button" className="md-sidebar-user" onClick={() => go("profile")}>
            <span className="md-avatar">{initials}</span>
            <span>
              <strong>
                {firstName} {data.lastName}
              </strong>
              <small>Mentor Conex</small>
            </span>
            <Icon name="chevron" size={15} />
          </button>
          <form action={logout}>
            <button type="submit" className="md-signout">
              <Icon name="logout" size={16} />
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>
      <div className="md-workspace">
        <header className="md-topbar">
          <div className="md-mobile-brand">
            <Brand />
          </div>
          <div className="md-breadcrumb">
            Mon espace <span>/</span>
            <strong>{activeLabel}</strong>
          </div>
          <div className="md-topbar-right">
            <span className="md-approved">
              <Icon name="check" size={13} />
              Candidature validée
            </span>
            <button
              className="md-avatar"
              type="button"
              aria-label="Ouvrir mon profil"
              onClick={() => go("profile")}
            >
              {initials}
            </button>
          </div>
        </header>
        <main id="mentor-main" className="md-main">
          <div className="md-page-heading">
            <div>
              <span className="md-eyebrow">L’ESPACE DES POSSIBLES</span>
              <h1>
                {view === "overview" ? (
                  <>
                    Bonjour, <em>{firstName}.</em>
                  </>
                ) : (
                  activeLabel
                )}
              </h1>
              <p>
                {view === "overview"
                  ? "Votre expérience a sa place ici. Construisons la suite."
                  : view === "projects"
                    ? "Des idées à faire grandir, des parcours à accompagner."
                    : view === "requests"
                      ? "Gardez le fil de vos prochaines rencontres."
                      : view === "mentorships"
                        ? "Un lien se construit, un échange après l’autre."
                        : view === "profile"
                          ? "Votre parcours, votre expertise, votre place dans Conex."
                          : "Un engagement pour transmettre dans la durée."}
              </p>
            </div>
            {view === "overview" && (
              <button type="button" className="md-outline" onClick={() => go("profile")}>
                <Icon name="user" size={16} />
                Mon profil
              </button>
            )}
          </div>

          {view === "overview" && (
            <>
              <section className="md-hero">
                <div className="md-hero-copy">
                  <span className="md-eyebrow">
                    {data.membershipActive ? "LE CHAMP DES POSSIBLES" : "VOTRE PROCHAINE ÉTAPE"}
                  </span>
                  <h2>
                    {data.membershipActive ? (
                      <>
                        Les bonnes rencontres
                        <br />
                        <em>commencent ici.</em>
                      </>
                    ) : (
                      <>
                        Votre dossier est validé.
                        <br />
                        <em>La suite vous attend.</em>
                      </>
                    )}
                  </h2>
                  <p>
                    {data.membershipActive
                      ? "Découvrez les projets validés et partagez votre regard là où il peut faire la différence."
                      : "L’adhésion est la prochaine étape pour découvrir les projets et proposer votre accompagnement."}
                  </p>
                  {action(
                    data.membershipActive ? "projects" : "membership",
                    data.membershipActive ? "Découvrir les projets" : "Découvrir mon adhésion",
                    true,
                  )}
                </div>
                <div className="md-hero-art" aria-hidden="true">
                  <i />
                  <i />
                  <div>
                    <Icon name="compass" size={50} />
                  </div>
                  <span>
                    PLUS LOIN,
                    <br />
                    <em>ensemble.</em>
                  </span>
                </div>
              </section>
              <div className="md-overview-grid">
                <section className="md-card md-connections">
                  <div className="md-section-heading">
                    <div>
                      <span className="md-eyebrow">LE CŒUR DU PARCOURS</span>
                      <h2>Mes accompagnements</h2>
                    </div>
                    {data.mentorships.length > 0 && action("mentorships", "Tout voir")}
                  </div>
                  {data.mentorships.length ? (
                    <div className="md-records">
                      {data.mentorships.slice(0, 2).map((item) => (
                        <article className="md-record" key={item.id}>
                          <span className="md-record-avatar">{item.founder.charAt(0)}</span>
                          <div>
                            <h3>{item.project}</h3>
                            <p>Avec {item.founder}</p>
                          </div>
                          <span className="md-tag">
                            {item.status === "PAUSED" ? "En pause" : "En cours"}
                          </span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon="people" title="Votre première rencontre se prépare.">
                      Un projet, une personne, un regard nouveau.
                      <br />
                      Votre premier accompagnement prendra sa place ici.
                    </EmptyState>
                  )}
                  <div className="md-card-bottom">
                    {action("projects", "Explorer les projets")}
                    {action("requests", "Suivre mes demandes")}
                  </div>
                </section>
                <section className="md-card md-journey">
                  <span className="md-eyebrow">PAS À PAS</span>
                  <h2>Votre parcours</h2>
                  <ol>
                    <li className="done">
                      <span>
                        <Icon name="check" size={14} />
                      </span>
                      <div>
                        <h3>Candidature validée</h3>
                        <p>Bienvenue dans le cercle Conex.</p>
                      </div>
                    </li>
                    <li className={data.membershipActive ? "done" : "current"}>
                      <span>{data.membershipActive ? <Icon name="check" size={14} /> : "02"}</span>
                      <div>
                        <h3>Votre adhésion</h3>
                        <p>
                          {data.membershipActive
                            ? "Votre engagement est confirmé."
                            : "La prochaine étape de votre engagement."}
                        </p>
                      </div>
                    </li>
                    <li className={data.mentorships.length ? "done" : ""}>
                      <span>
                        {data.mentorships.length ? <Icon name="check" size={14} /> : "03"}
                      </span>
                      <div>
                        <h3>Premier compagnonnage</h3>
                        <p>Une rencontre choisie, un chemin commun.</p>
                      </div>
                    </li>
                  </ol>
                  {action("membership", "Voir mon adhésion")}
                </section>
              </div>
              <div className="md-small-grid">
                <section className="md-small-card">
                  <span className="md-small-icon">
                    <Icon name="document" size={21} />
                  </span>
                  <div>
                    <h3>Votre dossier est prêt.</h3>
                    <p>
                      {data.documents.length} document{data.documents.length > 1 ? "s" : ""} dans
                      votre dossier mentor.
                    </p>
                    {action("profile", "Consulter mon dossier")}
                  </div>
                  <span className="md-mini-check">
                    <Icon name="check" size={13} />
                  </span>
                </section>
                <section className="md-small-card">
                  <span className="md-small-icon">
                    <Icon name="lock" size={21} />
                  </span>
                  <div>
                    <h3>
                      {data.visibility === "PRIVATE"
                        ? "Votre profil reste privé."
                        : "Votre visibilité sur Conex."}
                    </h3>
                    <p>Vos justificatifs restent confidentiels.</p>
                    {action("profile", "Voir mon profil")}
                  </div>
                </section>
              </div>
            </>
          )}

          {view === "projects" && (
            <section className="md-card md-view-card">
              {!data.canBrowse ? (
                <>
                  <EmptyState
                    icon="lock"
                    title={
                      data.membershipActive
                        ? "Vos accès sont en cours d’activation."
                        : "Une étape avant les rencontres."
                    }
                  >
                    {data.membershipActive
                      ? "Votre candidature est validée. L’accès au catalogue reste soumis à l’activation de votre compte."
                      : "Une adhésion active vous permettra de découvrir les projets validés et de proposer une rencontre."}
                  </EmptyState>
                  <div className="md-centered-action">
                    {action("membership", "Voir mon adhésion", true)}
                  </div>
                </>
              ) : data.projects.length ? (
                <div className="md-project-grid">
                  {data.projects.map((project) => (
                    <article className="md-project-card" key={project.id}>
                      <span className="md-tag">{project.sector || "Projet validé"}</span>
                      <h2>{project.title}</h2>
                      <p>
                        {project.summary || "Une idée à faire grandir avec un regard expérimenté."}
                      </p>
                      {project.supportNeeds && (
                        <details>
                          <summary>Les besoins d’accompagnement</summary>
                          <p>{project.supportNeeds}</p>
                        </details>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState icon="compass" title="Les prochaines idées prennent forme.">
                  Les projets validés apparaîtront ici lorsqu’ils seront disponibles.
                </EmptyState>
              )}
            </section>
          )}
          {view === "requests" && (
            <section className="md-card md-view-card">
              {data.requests.length ? (
                <div className="md-records">
                  {data.requests.map((item) => (
                    <article className="md-record md-detailed-record" key={item.id}>
                      <span className="md-record-avatar">{item.founder.charAt(0)}</span>
                      <div>
                        <h2>{item.project}</h2>
                        <p>Avec {item.founder}</p>
                        {item.meetingAt && (
                          <p className="md-date">
                            <Icon name="calendar" size={14} />
                            {date(item.meetingAt)}
                          </p>
                        )}
                        {item.message && (
                          <details>
                            <summary>Votre message</summary>
                            <p>{item.message}</p>
                          </details>
                        )}
                      </div>
                      <span className="md-tag">{requestLabels[item.status] ?? item.status}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <>
                  <EmptyState icon="message" title="Tout commence par un intérêt partagé.">
                    Vos demandes et leurs prochaines étapes apparaîtront ici, de l’examen par Conex
                    à la rencontre.
                  </EmptyState>
                  <div className="md-centered-action">
                    {action("projects", "Découvrir les projets", true)}
                  </div>
                </>
              )}
            </section>
          )}
          {view === "mentorships" && (
            <section className="md-card md-view-card">
              {data.mentorships.length ? (
                <div className="md-records">
                  {data.mentorships.map((item) => (
                    <article className="md-record md-detailed-record" key={item.id}>
                      <span className="md-record-avatar">{item.founder.charAt(0)}</span>
                      <div>
                        <h2>{item.project}</h2>
                        <p>Avec {item.founder}</p>
                        <p>
                          {item.lastFollowUpAt
                            ? `Dernier suivi : ${date(item.lastFollowUpAt)}`
                            : "Le premier échange reste à préparer."}
                        </p>
                      </div>
                      <span className="md-tag">
                        {item.status === "PAUSED" ? "En pause" : "En cours"}
                      </span>
                    </article>
                  ))}
                </div>
              ) : (
                <>
                  <EmptyState icon="people" title="Un lien à construire, à votre rythme.">
                    Vos accompagnements en cours seront réunis ici, avec les échanges et les
                    prochaines étapes.
                  </EmptyState>
                  <div className="md-centered-action">
                    {action("projects", "Explorer les projets", true)}
                  </div>
                </>
              )}
            </section>
          )}
          {view === "profile" && (
            <div className="md-profile-grid">
              <section className="md-card md-profile-card">
                <div className="md-profile-heading">
                  <span className="md-avatar md-large-avatar">{initials}</span>
                  <div>
                    <h2>
                      {firstName} {data.lastName}
                    </h2>
                    <p>{data.professionalTitle || "Mentor Conex"}</p>
                  </div>
                </div>
                {data.biography && <p className="md-biography">{data.biography}</p>}
                <dl className="md-profile-details">
                  <div>
                    <dt>Email</dt>
                    <dd>{data.email || "Non renseigné"}</dd>
                  </div>
                  <div>
                    <dt>Localisation</dt>
                    <dd>
                      {[data.city, data.countryCode].filter(Boolean).join(", ") || "Non renseignée"}
                    </dd>
                  </div>
                  <div>
                    <dt>Expertises</dt>
                    <dd>{data.expertise.join(", ") || "À compléter"}</dd>
                  </div>
                  <div>
                    <dt>Langues</dt>
                    <dd>{data.languages.join(", ") || "À compléter"}</dd>
                  </div>
                  <div>
                    <dt>Visibilité</dt>
                    <dd>
                      <Icon name="lock" size={14} />
                      {data.visibility === "PRIVATE"
                        ? "Profil privé"
                        : "Visibilité demandée sur Conex"}
                    </dd>
                  </div>
                </dl>
              </section>
              <section className="md-card md-profile-card">
                <span className="md-eyebrow">VOTRE CANDIDATURE</span>
                <h2>Mes justificatifs</h2>
                <p className="md-muted">Ces pièces sont réservées à l’examen de votre dossier.</p>
                <ul className="md-documents">
                  {data.documents.map((doc) => (
                    <li key={doc.id}>
                      <Icon name="document" size={20} />
                      <span>
                        {doc.name}
                        <small>{doc.type === "CV" ? "CV" : "Justificatif d’expérience"}</small>
                      </span>
                      <span className="md-tag">{documentLabels[doc.status] ?? doc.status}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
          {view === "membership" && (
            <div className="md-membership-grid">
              <section className="md-card md-membership-card">
                <span className="md-small-icon">
                  <Icon name="wallet" size={24} />
                </span>
                <span className="md-eyebrow">VOTRE ENGAGEMENT CONEX</span>
                <h2>
                  Une adhésion.
                  <br />
                  <em>Des liens à faire grandir.</em>
                </h2>
                <p>
                  Un cadre commun pour découvrir les projets, proposer une rencontre et accompagner
                  dans la durée.
                </p>
                <span className={`md-tag ${data.membershipActive ? "md-tag-active" : ""}`}>
                  {membershipLabel}
                </span>
                {data.membershipActive && data.membership?.endsAt ? (
                  <p>Votre adhésion est active jusqu’au {date(data.membership.endsAt)}.</p>
                ) : (
                  <div className="md-membership-note">
                    Les modalités d’adhésion sont en cours de préparation. Aucun paiement n’est
                    demandé depuis cet espace pour le moment.
                  </div>
                )}
              </section>
              <section className="md-card md-membership-benefits">
                <span className="md-eyebrow">AU FIL DE VOTRE PARCOURS</span>
                <h2>La rencontre, dans un cadre de confiance.</h2>
                {[
                  {
                    icon: "compass",
                    title: "Des projets validés",
                    text: "Des parcours examinés par Conex, avec des besoins identifiés.",
                  },
                  {
                    icon: "people",
                    title: "Une relation choisie",
                    text: "Une mise en relation accompagnée, avec l’accord de chacun.",
                  },
                  {
                    icon: "leaf",
                    title: "Un suivi dans la durée",
                    text: "Des objectifs partagés et des points réguliers pour avancer.",
                  },
                ].map((item) => (
                  <div key={item.title}>
                    <Icon name={item.icon} size={22} />
                    <span>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </span>
                  </div>
                ))}
              </section>
            </div>
          )}
          <footer className="md-footer">
            <span>CONEX · LE LIEN NOUS ÉLÈVE</span>
            <button type="button" onClick={() => go("requests")}>
              Mes demandes de rencontre
              <Icon name="arrow" size={14} />
            </button>
          </footer>
        </main>
      </div>
      <nav className="md-mobile-nav" aria-label="Navigation mentor mobile">
        {navigation
          .filter((item) => ["overview", "projects", "mentorships", "profile"].includes(item.id))
          .map((item) => (
            <button
              type="button"
              key={item.id}
              data-view={item.id}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => go(item.id)}
            >
              <Icon name={item.icon} size={20} />
              <span>{item.mobile}</span>
            </button>
          ))}
      </nav>
    </div>
  );
}
