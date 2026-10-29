"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { Link, useLocale, useTranslations } from "@/components/i18n";
import { Icon } from "@/components/icon";
import type { ProjectPresentation } from "@/lib/domain/project-catalogue";

const stageLabels: Record<string, string> = {
  IDEA: "Idée",
  PROTOTYPE: "Prototype",
  LAUNCHED: "Projet lancé",
  GROWTH: "En développement",
};
export function ProjectCatalogue({ projects }: { projects: ProjectPresentation[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const sectors = useMemo(
    () =>
      Array.from(
        new Set(
          projects
            .map((project) => project.sector)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b, locale)),
    [projects, locale],
  );
  const filtered = useMemo(
    () =>
      projects.filter((project) => {
        const search = [
          project.title,
          project.summary,
          project.sector,
          project.founder.firstName,
          project.founder.lastName,
          ...project.supportNeeds,
        ]
          .filter(Boolean)
          .join(" ")
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase(locale);
        return (
          (!sector || project.sector === sector) &&
          (!query.trim() ||
            search.includes(
              query
                .trim()
                .normalize("NFKD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLocaleLowerCase(locale),
            ))
        );
      }),
    [projects, query, sector, locale],
  );
  return (
    <>
      <div className="pc-toolbar">
        <label className="pc-search">
          <Icon name="search" size={19} />
          <span className="sr-only">{t("Rechercher un projet")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Un projet, un secteur, un besoin…")}
            maxLength={150}
          />
        </label>
        <label className="pc-sector">
          <span className="sr-only">{t("Filtrer par secteur")}</span>
          <select value={sector} onChange={(event) => setSector(event.target.value)}>
            <option value="">{t("Tous les secteurs")}</option>
            {sectors.map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <span className="pc-result-count" aria-live="polite">
          {filtered.length} {t(filtered.length === 1 ? "projet présenté" : "projets présentés")}
        </span>
      </div>
      {filtered.length ? (
        <div className="pc-grid">
          {filtered.map((project) => (
            <Link
              href={`/mentor/projets/${project.id}`}
              className="pc-project-card"
              key={project.id}
              aria-label={`${t("Découvrir le projet")} ${project.title}`}
            >
              <div className="pc-card-image">
                {project.image ? (
                  <Image
                    unoptimized
                    src={project.image.thumbnailUrl}
                    alt=""
                    fill
                    sizes="(max-width: 650px) 100vw, (max-width: 1050px) 50vw, 33vw"
                  />
                ) : (
                  <div className="pc-monogram" aria-hidden="true">
                    <span>{project.title.slice(0, 1).toLocaleUpperCase()}</span>
                    <Icon name="leaf" size={32} />
                  </div>
                )}
                {project.stage && (
                  <span className="pc-stage">{t(stageLabels[project.stage] ?? project.stage)}</span>
                )}
              </div>
              <div className="pc-card-copy">
                <span className="pc-card-sector">
                  {project.sector || t("Projet de la communauté")}
                </span>
                <h2>{project.title}</h2>
                <p>{project.summary || t("Découvrez ce projet et les besoins de son porteur.")}</p>
                <div className="pc-card-owner">
                  <span className="pc-owner-avatar" aria-hidden="true">
                    {project.founder.firstName.slice(0, 1)}
                  </span>
                  <span>
                    {project.founder.firstName} {project.founder.lastName}
                  </span>
                </div>
                <span className="pc-card-cta">
                  {t("Découvrir le projet")}
                  <Icon name="arrow" size={17} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="pc-empty">
          <Icon name="compass" size={38} />
          <h2>
            {t(
              projects.length
                ? "Aucun projet ne correspond à votre recherche."
                : "Les premières idées prennent forme.",
            )}
          </h2>
          <p>
            {t(
              projects.length
                ? "Essayez un autre mot-clé ou un autre secteur."
                : "Les projets présentés par les porteurs apparaîtront ici.",
            )}
          </p>
          {projects.length > 0 && (
            <button
              className="pc-reset"
              onClick={() => {
                setQuery("");
                setSector("");
              }}
            >
              {t("Effacer les filtres")}
            </button>
          )}
        </section>
      )}
    </>
  );
}
