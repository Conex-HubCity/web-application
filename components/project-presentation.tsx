import Image from "next/image";
import { Icon } from "@/components/icon";
import { Link } from "@/components/i18n";
import { getTranslator } from "@/lib/i18n/server";
import type { ProjectPresentation as ProjectPresentationData } from "@/lib/domain/project-catalogue";
const stageLabels: Record<string, string> = {
  IDEA: "Idée",
  PROTOTYPE: "Prototype",
  LAUNCHED: "Projet lancé",
  GROWTH: "En développement",
};
function externalLink(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export async function ProjectPresentation({
  project,
  audience,
}: {
  project: ProjectPresentationData;
  audience: "mentor" | "founder";
}) {
  const t = await getTranslator();
  const pitch = externalLink(project.pitchUrl);
  const links = [...project.socialLinks, ...project.customLinks]
    .map((link) => ({ ...link, href: externalLink(link.url) }))
    .filter((link) => link.href);
  return (
    <div className="pc-main pc-detail-main pc-workspace-content">
      <Link className="pc-back" href={audience === "founder" ? "/compte" : "/mentor/projets"}>
        <span aria-hidden="true">←</span>
        {t(audience === "founder" ? "Mon projet" : "Tous les projets")}
      </Link>
      <section className="pc-detail-hero">
        <div className="pc-detail-intro">
          <span className="pc-eyebrow">
            {t(audience === "founder" ? "VOTRE PRÉSENTATION" : "UN PROJET À DÉCOUVRIR")}
          </span>
          <h1>{project.title}</h1>
          <div className="pc-detail-tags">
            {project.sector && <span>{project.sector}</span>}
            {project.stage && <span>{t(stageLabels[project.stage] ?? project.stage)}</span>}
          </div>
          <div className="pc-detail-founder">
            <span className="pc-owner-avatar" aria-hidden="true">
              {project.founder.firstName.slice(0, 1)}
            </span>
            <div>
              <small>{t("Porté par")}</small>
              <strong>
                {project.founder.firstName} {project.founder.lastName}
              </strong>
            </div>
          </div>
          <span className="pc-visible">
            <Icon name="people" size={15} />
            {t("Visible aux mentors")}
          </span>
        </div>
        <div className="pc-detail-image">
          {project.image ? (
            <Image
              unoptimized
              src={project.image.fullUrl}
              alt={t("Image du projet") + " " + project.title}
              fill
              sizes="(max-width: 800px) 100vw, 50vw"
            />
          ) : (
            <div className="pc-monogram pc-monogram-large" aria-hidden="true">
              <span>{project.title.slice(0, 1).toLocaleUpperCase()}</span>
              <Icon name="leaf" size={48} />
            </div>
          )}
        </div>
      </section>
      <div className="pc-detail-grid">
        <div className="pc-detail-body">
          <section className="pc-panel">
            <span className="pc-section-number">01</span>
            <h2>{t("Le projet")}</h2>
            <p className="pc-description">
              {project.summary || t("La présentation de ce projet sera complétée prochainement.")}
            </p>
          </section>
          {project.supportNeeds.length > 0 && (
            <section className="pc-panel">
              <span className="pc-section-number">02</span>
              <h2>{t("Les besoins d’accompagnement")}</h2>
              <div className="pc-needs">
                {project.supportNeeds.map((need) => (
                  <span key={need}>{t(need)}</span>
                ))}
              </div>
            </section>
          )}
          {links.length > 0 && (
            <section className="pc-panel">
              <h2>{t("Les liens du projet")}</h2>
              <div className="pc-project-links">
                {links.map((link, index) => (
                  <a
                    key={link.url + index}
                    href={link.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                    <Icon name="diagonal" size={16} />
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="pc-detail-sidebar">
          <section className="pc-pitch">
            <Icon name="document" size={25} />
            <h2>{t("Découvrir le pitch")}</h2>
            <p>{t("Le projet, raconté par son porteur.")}</p>
            {pitch && (
              <a className="pc-primary" href={pitch} target="_blank" rel="noopener noreferrer">
                {t("Voir le pitch")}
                <Icon name="diagonal" size={17} />
              </a>
            )}
          </section>
          {audience === "mentor" && (
            <section className="pc-follow">
              <Icon name="people" size={24} />
              <h2>{t("Accompagner ce projet")}</h2>
              <button disabled type="button" aria-describedby="pc-mentoring-development">
                {t("Demander à accompagner")}
              </button>
              <p id="pc-mentoring-development">{t("En cours de développement")}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
