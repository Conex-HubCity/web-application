"use client";
import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { Link, useLocale, useTranslations } from "@/components/i18n";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icon";
import { logout } from "@/app/actions/auth";
import { saveProject } from "@/app/actions/project";
import { ImageUploadModal } from "@/components/image-upload-modal";
import type { ProjectImageView } from "@/lib/projects/images";
import type { FounderDashboardData } from "@/lib/domain/founder-dashboard";
const stages = [
  { value: "IDEA", label: "Idée" },
  { value: "PROTOTYPE", label: "Prototype" },
  { value: "LAUNCHED", label: "Projet lancé" },
  { value: "GROWTH", label: "En développement" },
];
const needs = [
  "Stratégie",
  "Modèle économique",
  "Développement commercial",
  "Financement",
  "Produit et technologie",
  "Organisation",
];
export function FounderDashboard({ data }: { data: FounderDashboardData }) {
  const t = useTranslations(),
    locale = useLocale();
  const [view, setView] = useState<"overview" | "project">("overview");
  const project = data.project;
  const externalLinks = (project?.socialLinks.length ?? 0) + (project?.customLinks.length ?? 0);
  const updated = project
    ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(project.updatedAt))
    : null;
  function go(next: "overview" | "project") {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return (
    <div className="fd-shell">
      <a className="skip-link" href="#founder-main">
        {t("Aller au contenu")}
      </a>
      <aside className="fd-sidebar">
        <Brand />
        <div className="fd-space-label">
          <span />
          {t("ESPACE PORTEUR")}
        </div>
        <nav aria-label={t("Navigation de mon espace")}>
          <button
            onClick={() => go("overview")}
            aria-current={view === "overview" ? "page" : undefined}
          >
            <Icon name="home" />
            {t("Vue d’ensemble")}
          </button>
          <button
            onClick={() => go("project")}
            aria-current={view === "project" ? "page" : undefined}
          >
            <Icon name="document" />
            {t("Mon projet")}
          </button>
          {project?.visible && (
            <Link href={`/mentor/projets/${project.id}`}>
              <Icon name="diagonal" />
              {t("Voir la présentation")}
            </Link>
          )}
          {data.certificationAvailable && !data.certified && (
            <Link href="/certification">
              <Icon name="check" />
              {t("Ma certification")}
            </Link>
          )}
        </nav>
        <div className="fd-sidebar-note">
          <Icon name="compass" size={23} />
          <p>{t("Une idée à partager. Des rencontres à venir.")}</p>
        </div>
        <div className="fd-sidebar-user">
          <span className="fd-avatar">{data.firstName.charAt(0)}</span>
          <div>
            <strong>
              {data.firstName} {data.lastName}
            </strong>
            <small>{t("Porteur de projet")}</small>
          </div>
        </div>
        <form action={logout}>
          <button className="fd-logout">
            <Icon name="logout" size={17} />
            {t("Se déconnecter")}
          </button>
        </form>
      </aside>
      <main className="fd-main" id="founder-main">
        <header className="fd-header">
          <span>
            {t("Mon espace")} <i>/</i>{" "}
            <strong>{t(view === "overview" ? "Vue d’ensemble" : "Mon projet")}</strong>
          </span>
          <span className="fd-account">
            <span className="fd-avatar">{data.firstName.charAt(0)}</span>
            {data.firstName}
          </span>
        </header>
        <div className="fd-heading">
          <div>
            <p className="fd-eyebrow">
              {t(view === "overview" ? "VOTRE PROJET PREND SA PLACE" : "PRÉSENTATION DU PROJET")}
            </p>
            <h1>
              {view === "overview" ? (
                <>
                  {t("Bonjour,")} <em>{data.firstName}.</em>
                </>
              ) : (
                t("Mon projet")
              )}
            </h1>
            <p>
              {t(
                view === "overview"
                  ? "Faites découvrir ce que vous construisez."
                  : "La présentation que les mentors découvriront.",
              )}
            </p>
          </div>
          {project && (
            <span className={`fd-status ${project.visible ? "is-visible" : ""}`}>
              <span />
              {t(project.visible ? "Visible aux mentors" : "Présentation à compléter")}
            </span>
          )}
        </div>
        {view === "overview" ? (
          <>
            <div className="fd-overview-grid">
              <section className="fd-feature-card">
                <div className={`fd-cover ${project?.image ? "has-image" : ""}`}>
                  {project?.image ? (
                    <Image
                      src={project.image.fullUrl}
                      alt={project.title}
                      fill
                      unoptimized
                      sizes="(max-width: 760px) 100vw, 60vw"
                      className="fd-cover-image"
                    />
                  ) : (
                    <div className="fd-cover-placeholder">
                      <span className="fd-brand-mark">
                        {project?.title.slice(0, 1).toUpperCase() || "CNX"}
                      </span>
                      <span className="fd-cover-orbit" />
                    </div>
                  )}
                  <span className="fd-cover-tag">{t("VOTRE PROJET")}</span>
                </div>
                <div className="fd-feature-copy">
                  <div className="fd-chips">
                    {project?.sector && <span>{project.sector}</span>}
                    {project?.stage && (
                      <span>
                        {t(
                          stages.find((stage) => stage.value === project.stage)?.label ??
                            project.stage,
                        )}
                      </span>
                    )}
                  </div>
                  <h2>{project?.title || t("Votre prochaine grande idée commence ici.")}</h2>
                  <p>
                    {project?.summary ||
                      t(
                        "Présentez votre projet, partagez votre pitch et rendez votre initiative visible aux mentors.",
                      )}
                  </p>
                  <div className="fd-feature-actions">
                    <button className="fd-primary" onClick={() => go("project")}>
                      {t(project ? "Modifier la présentation" : "Présenter mon projet")}
                      <Icon name="arrow" size={17} />
                    </button>
                    {project?.visible && (
                      <Link href={`/mentor/projets/${project.id}`} className="fd-text-action">
                        {t("Voir la présentation")}
                        <Icon name="diagonal" size={15} />
                      </Link>
                    )}
                  </div>
                  {updated && (
                    <span className="fd-updated">
                      {t("Mis à jour le")} {updated}
                    </span>
                  )}
                </div>
              </section>
              <div className="fd-side-cards">
                <section className="fd-card fd-visibility">
                  <div className="fd-icon-circle">
                    <Icon name="people" size={23} />
                  </div>
                  <span className="fd-eyebrow">{t("VISIBILITÉ")}</span>
                  <h2>
                    {t(
                      project?.visible
                        ? "Votre projet est en ligne."
                        : "Donnez vie à votre présentation.",
                    )}
                  </h2>
                  <p>
                    {t(
                      project?.visible
                        ? "Les mentors peuvent découvrir votre projet et consulter votre pitch."
                        : "Une présentation complète permet aux mentors de découvrir votre initiative.",
                    )}
                  </p>
                  <div className="fd-checklist">
                    {[
                      ["Présentation du projet", Boolean(project?.summary)],
                      ["Lien du pitch", Boolean(project?.pitchUrl)],
                      ["Image du projet", Boolean(project?.image)],
                    ].map(([label, done]) => (
                      <div key={label as string} className={done ? "is-complete" : ""}>
                        <span>
                          {done ? (
                            <Icon name="check" size={13} />
                          ) : (
                            <span className="fd-empty-dot" />
                          )}
                        </span>
                        {t(label as string)}
                        {!done && label === "Image du projet" && <small>{t("Facultatif")}</small>}
                      </div>
                    ))}
                  </div>
                </section>
                <section className="fd-card fd-support-card">
                  <span className="fd-development">{t("En cours de développement")}</span>
                  <h2>{t("Les rencontres arrivent.")}</h2>
                  <p>{t("Les demandes d’accompagnement seront disponibles prochainement.")}</p>
                  <button type="button" disabled>
                    <Icon name="lock" size={15} />
                    {t("Recevoir une demande de mentorat")}
                  </button>
                </section>
              </div>
            </div>
            <section className="fd-media-strip">
              <div>
                <Icon name="document" size={22} />
                <span>
                  <strong>{t("Votre pitch")}</strong>
                  <small>
                    {t(
                      project?.pitchUrl
                        ? "Prêt à être découvert"
                        : "Ajoutez le lien de votre présentation",
                    )}
                  </small>
                </span>
                {project?.pitchUrl ? (
                  <a href={project.pitchUrl} target="_blank" rel="noopener noreferrer">
                    {t("Ouvrir le pitch")}
                    <Icon name="diagonal" size={14} />
                  </a>
                ) : (
                  <button onClick={() => go("project")}>{t("Ajouter")}</button>
                )}
              </div>
              <div>
                <Icon name="globe" size={22} />
                <span>
                  <strong>{t("Vos liens")}</strong>
                  <small>
                    {externalLinks} {t("lien(s) partagé(s)")}
                  </small>
                </span>
                <button onClick={() => go("project")}>
                  {t("Gérer les liens")}
                  <Icon name="arrow" size={14} />
                </button>
              </div>
            </section>
          </>
        ) : (
          <>
            {project && !project.editable ? (
              <section className="fd-card">
                <h2>{project.title}</h2>
                <p>{t("Cette version ne peut plus être modifiée directement.")}</p>
                {project.visible && (
                  <Link className="fd-primary" href={`/mentor/projets/${project.id}`}>
                    {t("Voir la présentation")}
                  </Link>
                )}
              </section>
            ) : (
              <FounderProjectForm project={project} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
function FounderProjectForm({ project }: { project: FounderDashboardData["project"] }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(saveProject, null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [image, setImage] = useState<ProjectImageView | null>(project?.image ?? null);
  const [values, setValues] = useState({
    title: project?.title ?? "",
    summary: project?.summary ?? "",
    sector: project?.sector ?? "",
    stage: project?.stage ?? "",
    pitchUrl: project?.pitchUrl ?? "",
    needs: project?.supportNeeds ?? [],
    linkedinUrl: project?.socialLinks.find((link) => link.label === "LinkedIn")?.url ?? "",
    facebookUrl: project?.socialLinks.find((link) => link.label === "Facebook")?.url ?? "",
    instagramUrl: project?.socialLinks.find((link) => link.label === "Instagram")?.url ?? "",
  });
  const [links, setLinks] = useState(
    (project?.customLinks ?? []).map((link, index) => ({ ...link, key: index })),
  );
  const nextKey = useRef(links.length);
  const allNeeds = Array.from(new Set([...needs, ...(project?.supportNeeds ?? [])]));
  return (
    <>
      <form action={action} className="fd-form" onReset={(event) => event.preventDefault()}>
        <section className="fd-card fd-form-section">
          <div className="fd-section-heading">
            <span>01</span>
            <div>
              <h2>{t("L’essentiel du projet")}</h2>
              <p>{t("Ce que vous construisez et à qui cela s’adresse.")}</p>
            </div>
          </div>
          <label>
            {t("Nom du projet")} <span aria-hidden="true">*</span>
            <input
              name="title"
              required
              maxLength={200}
              value={values.title}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
              placeholder={t("Le nom de votre projet")}
            />
          </label>
          <label>
            {t("Présentation du projet")} <span aria-hidden="true">*</span>
            <textarea
              name="summary"
              required
              rows={6}
              maxLength={6000}
              value={values.summary}
              onChange={(e) => setValues({ ...values, summary: e.target.value })}
              placeholder={t("Quel problème résolvez-vous, pour qui et avec quelle solution ?")}
            />
          </label>
          <div className="fd-form-row">
            <label>
              {t("Secteur d’activité")}
              <input
                name="sector"
                maxLength={150}
                value={values.sector}
                onChange={(e) => setValues({ ...values, sector: e.target.value })}
                placeholder={t("Ex. agriculture, santé, numérique…")}
              />
            </label>
            <label>
              {t("Stade d’avancement")}
              <select
                name="stage"
                value={values.stage}
                onChange={(e) => setValues({ ...values, stage: e.target.value })}
              >
                <option value="">{t("Choisir un stade")}</option>
                {values.stage && !stages.some((stage) => stage.value === values.stage) && (
                  <option value={values.stage}>{values.stage}</option>
                )}
                {stages.map((stage) => (
                  <option key={stage.value} value={stage.value}>
                    {t(stage.label)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
        <section className="fd-card fd-form-section">
          <div className="fd-section-heading">
            <span>02</span>
            <div>
              <h2>{t("Pitch et identité visuelle")}</h2>
              <p>{t("Donnez aux mentors une première impression de votre projet.")}</p>
            </div>
          </div>
          <label>
            {t("Lien du pitch")} <span aria-hidden="true">*</span>
            <input
              name="pitchUrl"
              type="url"
              required
              maxLength={2048}
              value={values.pitchUrl}
              onChange={(e) => setValues({ ...values, pitchUrl: e.target.value })}
              placeholder="https://…"
            />
            <small>{t("Une vidéo, un document ou une présentation accessible par lien.")}</small>
          </label>
          <input name="brandingImageId" type="hidden" value={image?.id ?? ""} />
          <div className="fd-image-field">
            <div className="fd-image-preview">
              {image ? (
                <Image
                  src={image.thumbnailUrl}
                  alt={t("Image du projet")}
                  width={480}
                  height={320}
                  unoptimized
                />
              ) : (
                <Icon name="image" size={34} />
              )}
            </div>
            <div>
              <strong>{t("Image du projet")}</strong>
              <p>{t("Logo ou visuel de marque. PNG, JPEG ou WebP, 5 Mo maximum.")}</p>
              <div className="fd-image-actions">
                <button type="button" className="fd-secondary" onClick={() => setUploadOpen(true)}>
                  {t(image ? "Changer l’image" : "Ajouter une image")}
                </button>
                {image && (
                  <button type="button" className="fd-text-action" onClick={() => setImage(null)}>
                    {t("Retirer")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
        <section className="fd-card fd-form-section">
          <div className="fd-section-heading">
            <span>03</span>
            <div>
              <h2>{t("Votre présence en ligne")}</h2>
              <p>{t("Partagez vos réseaux et les liens utiles à votre projet.")}</p>
            </div>
          </div>
          <div className="fd-social-fields">
            {(
              [
                ["linkedinUrl", "LinkedIn"],
                ["facebookUrl", "Facebook"],
                ["instagramUrl", "Instagram"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  name={key}
                  type="url"
                  maxLength={2048}
                  value={values[key]}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                  placeholder="https://…"
                />
              </label>
            ))}
          </div>
          <div className="fd-links-header">
            <h3>{t("Autres liens")}</h3>
            <span>{t("Facultatif")}</span>
          </div>
          {links.map((link, index) => (
            <div className="fd-custom-link" key={link.key}>
              <label>
                {t("Nom du lien")}
                <input
                  name="linkLabel"
                  required
                  maxLength={60}
                  value={link.label}
                  onChange={(e) =>
                    setLinks(
                      links.map((item) =>
                        item.key === link.key ? { ...item, label: e.target.value } : item,
                      ),
                    )
                  }
                  placeholder={t("Ex. site web, boutique, portfolio")}
                />
              </label>
              <label>
                {t("Adresse du lien")}
                <input
                  name="linkUrl"
                  type="url"
                  required
                  maxLength={2048}
                  value={link.url}
                  onChange={(e) =>
                    setLinks(
                      links.map((item) =>
                        item.key === link.key ? { ...item, url: e.target.value } : item,
                      ),
                    )
                  }
                  placeholder="https://…"
                />
              </label>
              <button
                type="button"
                className="fd-remove-link"
                aria-label={t("Supprimer le lien") + " " + (index + 1)}
                onClick={() => setLinks(links.filter((item) => item.key !== link.key))}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="fd-add-link"
            disabled={links.length >= 8}
            onClick={() => setLinks([...links, { key: nextKey.current++, label: "", url: "" }])}
          >
            + {t("Ajouter un lien")}
          </button>
        </section>
        <section className="fd-card fd-form-section">
          <div className="fd-section-heading">
            <span>04</span>
            <div>
              <h2>{t("L’accompagnement recherché")}</h2>
              <p>{t("Sur quels sujets aimeriez-vous échanger avec un mentor ?")}</p>
            </div>
          </div>
          <fieldset>
            <legend className="sr-only">{t("Besoins d’accompagnement")}</legend>
            <div className="fd-needs">
              {allNeeds.map((need) => (
                <label key={need}>
                  <input
                    name="supportNeeds"
                    type="checkbox"
                    value={need}
                    checked={values.needs.includes(need)}
                    onChange={(e) =>
                      setValues({
                        ...values,
                        needs: e.target.checked
                          ? [...values.needs, need]
                          : values.needs.filter((value) => value !== need),
                      })
                    }
                  />
                  <span>{t(need)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>
        <div className="fd-form-footer">
          <div>
            {state?.error && (
              <p className="fd-error" role="alert">
                {t(state.error)}
              </p>
            )}
            {!pending && state?.success && (
              <p className="fd-success" role="status">
                <Icon name="check" size={17} />
                {t(state.success)}
              </p>
            )}
            <p>{t("Cette présentation sera consultable par les mentors.")}</p>
          </div>
          <button className="fd-primary" disabled={pending}>
            {t(
              pending
                ? "Enregistrement…"
                : project?.visible
                  ? "Enregistrer les modifications"
                  : "Publier ma présentation",
            )}
            <Icon name="arrow" size={17} />
          </button>
        </div>
      </form>
      <ImageUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(uploaded) => {
          setImage(uploaded);
          setUploadOpen(false);
        }}
      />
    </>
  );
}
