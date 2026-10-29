"use client";
import { useTranslations, useLocale } from "@/components/i18n";

import { useRouter } from "next/navigation";
import { localizePath } from "@/lib/i18n/config";
import { useState } from "react";
import { MentorProfile } from "./mentor-profile";
import { MentorShell } from "./mentor-shell";
import { mentorNavigation, type MentorView } from "@/lib/mentor-navigation";
import { Icon } from "./icon";
import type { MentorDashboardData } from "@/lib/domain/mentor-dashboard";

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

export function MentorDashboard({
  data,
  initialView = "overview",
}: {
  data: MentorDashboardData;
  initialView?: MentorView;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(value));
  const [view, setView] = useState<MentorView>(initialView);
  const firstName = data.firstName.charAt(0).toLocaleUpperCase("fr") + data.firstName.slice(1);
  const activeLabel = mentorNavigation.find((item) => item.id === view)!.label;
  function go(next: MentorView) {
    if (next === "projects") {
      router.push(localizePath("/mentor/projets", locale));
      return;
    }
    setView(next);
    window.scrollTo(0, 0);
  }
  const action = (next: MentorView, text: string, primary = false) => (
    <button
      type="button"
      className={primary ? "md-primary" : "md-text-action"}
      onClick={() => go(next)}
    >
      {text}
      <Icon name="arrow" size={17} />
    </button>
  );
  return (
    <MentorShell data={data} view={view} onNavigate={go}>
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
              t(activeLabel)
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
              <span className="md-eyebrow">{t("LE CHAMP DES POSSIBLES")}</span>
              <h2>
                {t("Les bonnes rencontres")}
                <br />
                <em>{t("commencent ici.")}</em>
              </h2>
              <p>
                {t(
                  "Découvrez les projets de la communauté. Les demandes d’accompagnement sont en cours de développement.",
                )}
              </p>
              {action("projects", t("Découvrir les projets"), true)}
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
                <li className="done">
                  <span>
                    <Icon name="check" size={14} />
                  </span>
                  <div>
                    <h3>{t("Contribution confirmée")}</h3>
                    <p>{t("Merci de soutenir CNX.")}</p>
                  </div>
                </li>
                <li className={data.mentorships.length ? "done" : ""}>
                  <span>{data.mentorships.length ? <Icon name="check" size={14} /> : "03"}</span>
                  <div>
                    <h3>{t("Premier compagnonnage")}</h3>
                    <p>{t("Une rencontre choisie, un chemin commun.")}</p>
                  </div>
                </li>
              </ol>
              {action("projects", t("Découvrir les projets"))}
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
      <footer className="md-footer">
        <span>{t("CONNEX · LE LIEN NOUS ÉLÈVE")}</span>
        <button type="button" onClick={() => go("requests")}>
          {" "}
          {t("Mes demandes de rencontre")} <Icon name="arrow" size={14} />
        </button>
      </footer>
    </MentorShell>
  );
}
