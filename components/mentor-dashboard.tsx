"use client";
import { useTranslations, useLocale } from "@/components/i18n";

import { useRouter } from "next/navigation";
import { localizePath } from "@/lib/i18n/config";
import { useState } from "react";
import { MentorProfile } from "./mentor-profile";
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
  PENDING_REVIEW: "Examen par CNX",
  REJECTED: "Demande non retenue",
  INVITED: "Rencontre à organiser",
  INTRO_SCHEDULED: "Rencontre programmée",
  AWAITING_CONSENT: "Accords attendus",
  ACCEPTED: "Accords confirmés",
  DECLINED: "Demande déclinée",
  CANCELLED: "Demande annulée",
  EXPIRED: "Demande expirée",
};

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
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(value));
  const [view, setView] = useState<View>("overview");
  const firstName = data.firstName.charAt(0).toLocaleUpperCase("fr") + data.firstName.slice(1);
  const initials = (data.firstName.charAt(0) + (data.lastName?.charAt(0) ?? "")).toUpperCase();
  const activeLabel = navigation.find((item) => item.id === view)!.label;
  function go(next: View) {
    if (next === "projects") {
      router.push(localizePath("/mentor/projets", locale));
      return;
    }
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
    ? t("Active")
    : data.membership?.status === "EXPIRED"
      ? t("À renouveler")
      : data.membership?.status === "SUSPENDED"
        ? t("Suspendue")
        : data.membership?.status === "CANCELLED"
          ? t("Résiliée")
          : t("À activer");

  return (
    <div className="mentor-shell">
      <a href="#mentor-main" className="skip-link">
        {" "}
        {t("Aller au contenu")}{" "}
      </a>
      <aside className="md-sidebar">
        <Brand />
        <div className="md-workspace-label">
          <span /> {t("ESPACE MENTOR")}{" "}
        </div>
        <span className="md-nav-label">{t("MON PARCOURS")}</span>
        <nav aria-label={t("Navigation mentor")}>
          {navigation.map((item) => (
            <button
              type="button"
              key={item.id}
              data-view={item.id}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => go(item.id)}
            >
              <Icon name={item.icon} size={19} />
              <span>{t(item.label)}</span>
              {item.id === "membership" && !data.membershipActive && (
                <i aria-label={t("Adhésion à activer")} />
              )}
            </button>
          ))}
        </nav>
        <div className="md-sidebar-bottom">
          <button type="button" className="md-sidebar-user" onClick={() => go("profile")}>
            <span className="md-avatar">{initials}</span>
            <span>
              <strong>
                {firstName} {data.lastName}
              </strong>
              <small>{t("Mentor CNX")}</small>
            </span>
            <Icon name="chevron" size={15} />
          </button>
          <form action={logout}>
            <button type="submit" className="md-signout">
              <Icon name="logout" size={16} /> {t("Se déconnecter")}{" "}
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
            {" "}
            {t("Mon espace")} <span>/</span>
            <strong>{t(activeLabel)}</strong>
          </div>
          <div className="md-topbar-right">
            <span className="md-approved">
              <Icon name="check" size={13} /> {t("Candidature validée")}{" "}
            </span>
            <button
              className="md-avatar"
              type="button"
              aria-label={t("Ouvrir mon profil")}
              onClick={() => go("profile")}
            >
              {initials}
            </button>
          </div>
        </header>
        <main id="mentor-main" className="md-main">
          <div className="md-page-heading">
            <div>
              <span className="md-eyebrow">{t("L’ESPACE DES POSSIBLES")}</span>
              <h1>
                {view === "overview" ? (
                  <>
                    {" "}
                    {t("Bonjour,")} <em>{firstName}.</em>
                  </>
                ) : (
                  activeLabel
                )}
              </h1>
              <p>
                {view === "overview"
                  ? t("Votre expérience a sa place ici. Construisons la suite.")
                  : view === "projects"
                    ? t("Des idées à faire grandir, des parcours à accompagner.")
                    : view === "requests"
                      ? t("Gardez le fil de vos prochaines rencontres.")
                      : view === "mentorships"
                        ? t("Un lien se construit, un échange après l’autre.")
                        : view === "profile"
                          ? t("Votre parcours, votre expertise, votre place dans CNX.")
                          : t("Un engagement pour transmettre dans la durée.")}
              </p>
            </div>
            {view === "overview" && (
              <button type="button" className="md-outline" onClick={() => go("profile")}>
                <Icon name="user" size={16} /> {t("Mon profil")}{" "}
              </button>
            )}
          </div>

          {view === "overview" && (
            <>
              <section className="md-hero">
                <div className="md-hero-copy">
                  <span className="md-eyebrow">
                    {data.membershipActive
                      ? t("LE CHAMP DES POSSIBLES")
                      : t("VOTRE PROCHAINE ÉTAPE")}
                  </span>
                  <h2>
                    {data.membershipActive ? (
                      <>
                        {" "}
                        {t("Les bonnes rencontres")} <br />
                        <em>{t("commencent ici.")}</em>
                      </>
                    ) : (
                      <>
                        {" "}
                        {t("Votre dossier est validé.")} <br />
                        <em>{t("La suite vous attend.")}</em>
                      </>
                    )}
                  </h2>
                  <p>
                    {data.membershipActive
                      ? t(
                          "Découvrez les projets validés et partagez votre regard là où il peut faire la différence.",
                        )
                      : t(
                          "L’adhésion est la prochaine étape pour découvrir les projets et proposer votre accompagnement.",
                        )}
                  </p>
                  {action(
                    data.membershipActive ? "projects" : "membership",
                    data.membershipActive
                      ? t("Découvrir les projets")
                      : t("Découvrir mon adhésion"),
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
                    {" "}
                    {t("PLUS LOIN,")} <br />
                    <em>{t("ensemble.")}</em>
                  </span>
                </div>
              </section>
              <div className="md-overview-grid">
                <section className="md-card md-connections">
                  <div className="md-section-heading">
                    <div>
                      <span className="md-eyebrow">{t("LE CŒUR DU PARCOURS")}</span>
                      <h2>{t("Mes accompagnements")}</h2>
                    </div>
                    {data.mentorships.length > 0 && action("mentorships", t("Tout voir"))}
                  </div>
                  {data.mentorships.length ? (
                    <div className="md-records">
                      {data.mentorships.slice(0, 2).map((item) => (
                        <article className="md-record" key={item.id}>
                          <span className="md-record-avatar">{item.founder.charAt(0)}</span>
                          <div>
                            <h3>{item.project}</h3>
                            <p>
                              {t("Avec")} {item.founder}
                            </p>
                          </div>
                          <span className="md-tag">
                            {item.status === "PAUSED" ? t("En pause") : t("En cours")}
                          </span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon="people" title={t("Votre première rencontre se prépare.")}>
                      {" "}
                      {t("Un projet, une personne, un regard nouveau.")} <br />{" "}
                      {t("Votre premier accompagnement prendra sa place ici.")}{" "}
                    </EmptyState>
                  )}
                  <div className="md-card-bottom">
                    {action("projects", t("Explorer les projets"))}
                    {action("requests", t("Suivre mes demandes"))}
                  </div>
                </section>
                <section className="md-card md-journey">
                  <span className="md-eyebrow">{t("PAS À PAS")}</span>
                  <h2>{t("Votre parcours")}</h2>
                  <ol>
                    <li className="done">
                      <span>
                        <Icon name="check" size={14} />
                      </span>
                      <div>
                        <h3>{t("Candidature validée")}</h3>
                        <p>{t("Bienvenue dans le cercle CNX.")}</p>
                      </div>
                    </li>
                    <li className={data.membershipActive ? "done" : "current"}>
                      <span>{data.membershipActive ? <Icon name="check" size={14} /> : "02"}</span>
                      <div>
                        <h3>{t("Votre adhésion")}</h3>
                        <p>
                          {data.membershipActive
                            ? t("Votre engagement est confirmé.")
                            : t("La prochaine étape de votre engagement.")}
                        </p>
                      </div>
                    </li>
                    <li className={data.mentorships.length ? "done" : ""}>
                      <span>
                        {data.mentorships.length ? <Icon name="check" size={14} /> : "03"}
                      </span>
                      <div>
                        <h3>{t("Premier compagnonnage")}</h3>
                        <p>{t("Une rencontre choisie, un chemin commun.")}</p>
                      </div>
                    </li>
                  </ol>
                  {action("membership", t("Voir mon adhésion"))}
                </section>
              </div>
              <div className="md-small-grid">
                <section className="md-small-card">
                  <span className="md-small-icon">
                    <Icon name="document" size={21} />
                  </span>
                  <div>
                    <h3>{t("Votre dossier est prêt.")}</h3>
                    <p>
                      {data.documents.length} document{data.documents.length > 1 ? "s" : ""}{" "}
                      {t("dans votre dossier mentor.")}{" "}
                    </p>
                    {action("profile", t("Consulter mon dossier"))}
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
                        ? t("Votre profil reste privé.")
                        : t("Votre visibilité sur CNX.")}
                    </h3>
                    <p>{t("Vos justificatifs restent confidentiels.")}</p>
                    {action("profile", t("Voir mon profil"))}
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
                        ? t("Vos accès sont en cours d’activation.")
                        : t("Une étape avant les rencontres.")
                    }
                  >
                    {data.membershipActive
                      ? t(
                          "Votre candidature est validée. L’accès au catalogue reste soumis à l’activation de votre compte.",
                        )
                      : t(
                          "Une adhésion active vous permettra de découvrir les projets validés et de proposer une rencontre.",
                        )}
                  </EmptyState>
                  <div className="md-centered-action">
                    {action("membership", t("Voir mon adhésion"), true)}
                  </div>
                </>
              ) : data.projects.length ? (
                <div className="md-project-grid">
                  {data.projects.map((project) => (
                    <article className="md-project-card" key={project.id}>
                      <span className="md-tag">{project.sector || t("Projet validé")}</span>
                      <h2>{project.title}</h2>
                      <p>
                        {project.summary ||
                          t("Une idée à faire grandir avec un regard expérimenté.")}
                      </p>
                      {project.supportNeeds && (
                        <details>
                          <summary>{t("Les besoins d’accompagnement")}</summary>
                          <p>{project.supportNeeds}</p>
                        </details>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState icon="compass" title={t("Les prochaines idées prennent forme.")}>
                  {" "}
                  {t("Les projets validés apparaîtront ici lorsqu’ils seront disponibles.")}{" "}
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
                        <p>
                          {t("Avec")} {item.founder}
                        </p>
                        {item.meetingAt && (
                          <p className="md-date">
                            <Icon name="calendar" size={14} />
                            {date(item.meetingAt)}
                          </p>
                        )}
                        {item.message && (
                          <details>
                            <summary>{t("Votre message")}</summary>
                            <p>{item.message}</p>
                          </details>
                        )}
                      </div>
                      <span className="md-tag">{t(requestLabels[item.status] ?? item.status)}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <>
                  <EmptyState icon="message" title={t("Tout commence par un intérêt partagé.")}>
                    {" "}
                    {t(
                      "Vos demandes et leurs prochaines étapes apparaîtront ici, de l’examen par CNX à la rencontre.",
                    )}{" "}
                  </EmptyState>
                  <div className="md-centered-action">
                    {action("projects", t("Découvrir les projets"), true)}
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
                        <p>
                          {t("Avec")} {item.founder}
                        </p>
                        <p>
                          {item.lastFollowUpAt
                            ? `${t("Dernier suivi :")} ${date(item.lastFollowUpAt)}`
                            : t("Le premier échange reste à préparer.")}
                        </p>
                      </div>
                      <span className="md-tag">
                        {item.status === "PAUSED" ? t("En pause") : t("En cours")}
                      </span>
                    </article>
                  ))}
                </div>
              ) : (
                <>
                  <EmptyState icon="people" title={t("Un lien à construire, à votre rythme.")}>
                    {" "}
                    {t(
                      "Vos accompagnements en cours seront réunis ici, avec les échanges et les prochaines étapes.",
                    )}{" "}
                  </EmptyState>
                  <div className="md-centered-action">
                    {action("projects", t("Explorer les projets"), true)}
                  </div>
                </>
              )}
            </section>
          )}
          {view === "profile" && <MentorProfile data={data} />}
          {view === "membership" && (
            <div className="md-membership-grid">
              <section className="md-card md-membership-card">
                <span className="md-small-icon">
                  <Icon name="wallet" size={24} />
                </span>
                <span className="md-eyebrow">{t("VOTRE ENGAGEMENT CONNEX")}</span>
                <h2>
                  {" "}
                  {t("Une adhésion.")} <br />
                  <em>{t("Des liens à faire grandir.")}</em>
                </h2>
                <p>
                  {" "}
                  {t(
                    "Un cadre commun pour découvrir les projets, proposer une rencontre et accompagner dans la durée.",
                  )}{" "}
                </p>
                <span className={`md-tag ${data.membershipActive ? "md-tag-active" : ""}`}>
                  {membershipLabel}
                </span>
                {data.membershipActive && data.membership?.endsAt ? (
                  <p>
                    {t("Votre adhésion est active jusqu’au")} {date(data.membership.endsAt)}.
                  </p>
                ) : (
                  <div className="md-membership-note">
                    {" "}
                    {t(
                      "Les modalités d’adhésion sont en cours de préparation. Aucun paiement n’est demandé depuis cet espace pour le moment.",
                    )}{" "}
                  </div>
                )}
              </section>
              <section className="md-card md-membership-benefits">
                <span className="md-eyebrow">{t("AU FIL DE VOTRE PARCOURS")}</span>
                <h2>{t("La rencontre, dans un cadre de confiance.")}</h2>
                {[
                  {
                    icon: "compass",
                    title: t("Des projets validés"),
                    text: t("Des parcours examinés par CNX, avec des besoins identifiés."),
                  },
                  {
                    icon: "people",
                    title: t("Une relation choisie"),
                    text: t("Une mise en relation accompagnée, avec l’accord de chacun."),
                  },
                  {
                    icon: "leaf",
                    title: t("Un suivi dans la durée"),
                    text: t("Des objectifs partagés et des points réguliers pour avancer."),
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
            <span>{t("CONNEX · LE LIEN NOUS ÉLÈVE")}</span>
            <button type="button" onClick={() => go("requests")}>
              {" "}
              {t("Mes demandes de rencontre")} <Icon name="arrow" size={14} />
            </button>
          </footer>
        </main>
      </div>
      <nav className="md-mobile-nav" aria-label={t("Navigation mentor mobile")}>
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
              <span>{t(item.mobile)}</span>
            </button>
          ))}
      </nav>
    </div>
  );
}
