"use client";
import { useTranslations, LanguageSwitcher } from "@/components/i18n";
import Image from "next/image";
import { Link } from "@/components/i18n";
import { useRef, useState } from "react";
import { Icon } from "./icon";
import { members, resources, type Member } from "@/lib/demo-data";
const navigation = [
  { label: "Vue d’ensemble", icon: "home" },
  { label: "La communauté", icon: "people" },
  { label: "Mes favoris", icon: "bookmark" },
  { label: "Messagerie", icon: "message" },
  { label: "Ressources", icon: "book" },
];
export function Workspace() {
  const t = useTranslations();
  const [active, setActive] = useState("Vue d’ensemble");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Tous les profils");
  const [saved, setSaved] = useState<string[]>([]);
  const [profile, setProfile] = useState<Member | null>(null);
  const [article, setArticle] = useState<(typeof resources)[number] | null>(null);
  const [name, setName] = useState("");
  const [draftName, setDraftName] = useState("");
  const detailDialog = useRef<HTMLDialogElement>(null);
  const setupDialog = useRef<HTMLDialogElement>(null);
  const isHome = active === "Vue d’ensemble";
  const isPeople = isHome || active === "La communauté" || active === "Mes favoris";
  const visibleMembers = members.filter((member) => {
    const text = `${member.name} ${t(member.title)} ${member.location} ${member.skills.map(t).join(" ")}`;
    return (
      text.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")) &&
      (filter === "Tous les profils" ||
        (filter === "Mentors" ? member.role === "Mentor" : member.role === "Entrepreneure")) &&
      (active !== "Mes favoris" || saved.includes(member.id))
    );
  });
  function navigate(label: string) {
    setActive(label);
    setQuery("");
    setFilter("Tous les profils");
  }
  function showMember(member: Member) {
    setProfile(member);
    setArticle(null);
    detailDialog.current?.showModal();
  }
  function showResource(resource: (typeof resources)[number]) {
    setArticle(resource);
    setProfile(null);
    detailDialog.current?.showModal();
  }
  function toggleTheme() {
    document.documentElement.dataset.theme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  }
  return (
    <div className="workspace">
      <a className="skip-link" href="#main">
        {" "}
        {t("Aller au contenu")}{" "}
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label={t("Connex, accueil")}>
          <span className="brand-symbol" aria-hidden="true">
            <i />
            <i />
          </span>
          connex<span className="brand-period">.</span>
        </Link>
        <div className="workspace-label">
          <span className="live-dot" /> {t("L’ESPACE DES POSSIBLES")}{" "}
        </div>
        <div className="nav-caption">{t("VOTRE ESPACE")}</div>
        <nav aria-label={t("Navigation principale")}>
          {navigation.map((item) => (
            <button
              key={t(item.label)}
              aria-label={t(item.label)}
              className={`nav-item ${active === item.label ? "active" : ""}`}
              onClick={() => navigate(item.label)}
              aria-current={active === item.label ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span>{t(item.label)}</span>
              {item.label === "Mes favoris" && saved.length > 0 && (
                <span className="nav-count">{saved.length}</span>
              )}
              {active === item.label && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="transmission">
            <Icon name="leaf" size={25} />
            <p>
              {" "}
              {t("Une rencontre.")} <br />
              <strong>{t("De nouveaux possibles.")}</strong>
            </p>
            <span>{t("Le lien nous élève.")}</span>
          </div>
          <button className="sidebar-profile" onClick={() => setupDialog.current?.showModal()}>
            <span className="avatar">{name ? name.charAt(0).toUpperCase() : "C"}</span>
            <span>
              <strong>{name || t("Votre espace Connex")}</strong>
              <small>{name ? t("Profil de démonstration") : t("Compléter mon profil")}</small>
            </span>
            <Icon name="chevron" size={16} />
          </button>
          <div className="initiative">
            {" "}
            {t("Une initiative de")} <strong>HubCity</strong>
            <span>© 2026 Connex</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            {" "}
            {t("Mon espace")} <span>/</span> <strong>{t(active)}</strong>
          </div>
          <div className="topbar-actions">
            <LanguageSwitcher />
            <span className="demo-label">
              <span className="live-dot" /> {t("Espace de démonstration")}{" "}
            </span>
            <button
              className="icon-button"
              aria-label={t("Basculer entre le thème clair et sombre")}
              onClick={toggleTheme}
            >
              <Icon name="sun" />
            </button>
            <button
              className="avatar avatar-small"
              aria-label={t("Ouvrir mon profil")}
              onClick={() => setupDialog.current?.showModal()}
            >
              {name ? name.charAt(0).toUpperCase() : "C"}
            </button>
          </div>
        </header>
        <main id="main" className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">{t("GRANDIR, ENSEMBLE")}</div>
              <h1>
                {isHome ? `${t("Bienvenue")}${name ? `, ${name}` : t(" sur Connex")}` : t(active)}
                <span className="gold-period">.</span>
              </h1>
              <p>
                {isHome
                  ? t("Les bonnes rencontres font avancer les grandes idées.")
                  : active === "Messagerie"
                    ? t("Un espace pour poursuivre les conversations qui comptent.")
                    : active === "Ressources"
                      ? t("Des repères pour avancer, à votre rythme.")
                      : t("Découvrez les personnes avec qui construire la suite.")}
              </p>
            </div>
            <span className="heading-note">
              <Icon name="compass" size={16} /> {t("Connecter. Transmettre. Grandir.")}{" "}
            </span>
          </div>
          {isHome && (
            <>
              <section className="welcome-banner" aria-labelledby="banner-title">
                <div className="banner-copy">
                  <span className="banner-eyebrow">
                    <span /> {t("UN RÉSEAU, DES POSSIBLES")}{" "}
                  </span>
                  <h2 id="banner-title">
                    {" "}
                    {t("Votre prochaine étape")} <br /> {t("commence par")} <em>{t("un lien.")}</em>
                  </h2>
                  <p>
                    {" "}
                    {t("Des entrepreneurs qui osent. Des mentors qui transmettent.")}{" "}
                    <br className="desktop-break" />{" "}
                    {t("Un espace commun pour aller plus loin.")}{" "}
                  </p>
                  <button className="button button-gold" onClick={() => navigate("La communauté")}>
                    {" "}
                    {t("Explorer la communauté")} <Icon name="arrow" size={18} />
                  </button>
                  <div className="banner-footnote">
                    <span className="little-line" />{" "}
                    {t("L’Afrique et sa diaspora, unies par la transmission.")}{" "}
                  </div>
                </div>
                <div className="banner-photo">
                  <Image
                    src="/assets/conex/rencontre.webp"
                    alt={t("Illustration d’un échange autour d’un projet")}
                    fill
                    sizes="(max-width: 700px) 100vw, 45vw"
                    preload
                  />
                  <div className="photo-caption">
                    <span className="caption-star">✳</span>
                    <span>
                      {" "}
                      {t("Le lien nous élève.")}
                      <small>{t("ET TOUT COMMENCE PAR UNE RENCONTRE.")}</small>
                    </span>
                  </div>
                </div>
              </section>
              <div className="quick-actions">
                <button onClick={() => setupDialog.current?.showModal()}>
                  <span className="action-icon warm">
                    <Icon name="compass" size={23} />
                  </span>
                  <span>
                    <strong>{t("Faites le premier pas")}</strong>
                    <small>{t("Présentez-vous à la communauté")}</small>
                  </span>
                  <Icon name="diagonal" size={18} />
                </button>
                <button
                  onClick={() => {
                    navigate("La communauté");
                    setFilter("Mentors");
                  }}
                >
                  <span className="action-icon sage">
                    <Icon name="people" size={23} />
                  </span>
                  <span>
                    <strong>{t("Trouvez un regard nouveau")}</strong>
                    <small>{t("Découvrez les profils de mentors")}</small>
                  </span>
                  <Icon name="diagonal" size={18} />
                </button>
                <button onClick={() => navigate("Ressources")}>
                  <span className="action-icon lilac">
                    <Icon name="book" size={23} />
                  </span>
                  <span>
                    <strong>{t("Nourrissez votre projet")}</strong>
                    <small>{t("Explorez les ressources")}</small>
                  </span>
                  <Icon name="diagonal" size={18} />
                </button>
              </div>
            </>
          )}
          {isPeople && (
            <section className="community-section" aria-labelledby="community-title">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">{t("DES PARCOURS QUI SE CROISENT")}</div>
                  <h2 id="community-title">
                    {active === "Mes favoris"
                      ? t("Les profils à retrouver")
                      : t("La communauté vous attend")}
                  </h2>
                </div>
                {isHome && (
                  <button className="text-button" onClick={() => navigate("La communauté")}>
                    {" "}
                    {t("Voir la communauté")} <Icon name="arrow" size={17} />
                  </button>
                )}
              </div>
              <div className="directory-tools">
                <div className="filter-tabs" aria-label={t("Filtrer les profils")}>
                  {["Tous les profils", "Mentors", "Entrepreneurs"].map((item) => (
                    <button
                      key={t(item)}
                      onClick={() => setFilter(item)}
                      className={filter === item ? "selected" : ""}
                      aria-pressed={filter === item}
                    >
                      {t(item)}
                    </button>
                  ))}
                </div>
                <label className="search-field">
                  <Icon name="search" size={17} />
                  <span className="sr-only">
                    {t("Rechercher un profil, une expertise ou une ville")}
                  </span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("Un nom, une expertise, une ville…")}
                  />
                </label>
              </div>
              <div className="member-grid">
                {visibleMembers.map((member) => (
                  <article key={member.id} className="member-card">
                    <div className="member-photo">
                      <Image
                        src={`/assets/conex/${member.image}`}
                        alt={`${t("Portrait illustratif du profil")} ${member.name}`}
                        fill
                        sizes="(max-width: 700px) 100vw, (max-width: 1100px) 45vw, 25vw"
                      />
                      <span className={`role-badge ${member.role === "Mentor" ? "mentor" : ""}`}>
                        <span />
                        {t(member.role)}
                      </span>
                      <button
                        className={`save-button ${saved.includes(member.id) ? "saved" : ""}`}
                        aria-label={`${t(saved.includes(member.id) ? "Retirer des favoris" : "Ajouter aux favoris")} : ${member.name}`}
                        aria-pressed={saved.includes(member.id)}
                        onClick={() =>
                          setSaved((previous) =>
                            previous.includes(member.id)
                              ? previous.filter((id) => id !== member.id)
                              : [...previous, member.id],
                          )
                        }
                      >
                        <Icon name="bookmark" size={17} />
                      </button>
                      <span className="sample-tag">{t("Profil illustratif")}</span>
                    </div>
                    <div className="member-info">
                      <h3>{member.name}</h3>
                      <p className="member-title">{t(member.title)}</p>
                      <p className="member-location">
                        <Icon name="pin" size={13} />
                        {member.location}
                      </p>
                      <div className="skills">
                        {member.skills.map((skill) => (
                          <span key={t(skill)}>{t(skill)}</span>
                        ))}
                      </div>
                      <button className="profile-link" onClick={() => showMember(member)}>
                        {" "}
                        {t("Découvrir le profil")} <Icon name="arrow" size={17} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {visibleMembers.length === 0 && (
                <div className="empty-state">
                  <Icon name={active === "Mes favoris" ? "bookmark" : "search"} size={32} />
                  <h3>
                    {active === "Mes favoris" && !saved.length
                      ? t("Gardez les rencontres en perspective")
                      : t("Aucun profil ne correspond")}
                  </h3>
                  <p>
                    {active === "Mes favoris" && !saved.length
                      ? t(
                          "Ajoutez un profil aux favoris pour le retrouver ici pendant votre visite.",
                        )
                      : t("Essayez une autre recherche ou un autre filtre.")}
                  </p>
                </div>
              )}
            </section>
          )}
          {(isHome || active === "Ressources") && (
            <section className="resources-section" aria-labelledby="resources-title">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">{t("UN PEU D’INSPIRATION, UN PAS DE PLUS")}</div>
                  <h2 id="resources-title">{t("Pour faire avancer vos idées")}</h2>
                </div>
                {isHome && (
                  <button className="text-button" onClick={() => navigate("Ressources")}>
                    {" "}
                    {t("Toutes les ressources")} <Icon name="arrow" size={17} />
                  </button>
                )}
              </div>
              <div className="resource-grid">
                {resources.map((resource) => (
                  <button
                    key={resource.id}
                    className="resource-card"
                    onClick={() => showResource(resource)}
                  >
                    <span className="resource-icon">
                      <Icon name={resource.icon} size={28} />
                    </span>
                    <span className="resource-copy">
                      <small>{t(resource.category)}</small>
                      <strong>{t(resource.title)}</strong>
                      <span>{t(resource.duration)}</span>
                    </span>
                    <Icon name="diagonal" size={20} />
                  </button>
                ))}
              </div>
            </section>
          )}
          {active === "Messagerie" && (
            <section className="empty-state message-empty">
              <span className="action-icon sage">
                <Icon name="message" size={30} />
              </span>
              <h2>{t("Les échanges commencent par une rencontre.")}</h2>
              <p>
                {" "}
                {t(
                  "La messagerie sera disponible lorsque les comptes et les mises en relation seront connectés. En attendant, explorez les profils de démonstration.",
                )}{" "}
              </p>
              <button className="button button-forest" onClick={() => navigate("La communauté")}>
                {" "}
                {t("Découvrir la communauté")} <Icon name="arrow" size={18} />
              </button>
            </section>
          )}
          <footer className="page-footer">
            <span>
              CONNEX <i>·</i> {t("Le lien nous élève.")}{" "}
            </span>
            <span>{t("Prototype · profils et contenus illustratifs")}</span>
          </footer>
        </main>
      </div>
      <dialog ref={detailDialog} className="detail-dialog" aria-labelledby="detail-title">
        <button
          className="dialog-close icon-button"
          aria-label={t("Fermer")}
          onClick={() => detailDialog.current?.close()}
        >
          <Icon name="close" />
        </button>
        {profile && (
          <>
            <div className="eyebrow">
              {t("PROFIL DE DÉMONSTRATION ·")} {t(profile.role).toUpperCase()}
            </div>
            <h2 id="detail-title">{profile.name}</h2>
            <p className="dialog-subtitle">
              {t(profile.title)} · {profile.location}
            </p>
            <p>{t(profile.bio)}</p>
            <div className="skills">
              {profile.skills.map((skill) => (
                <span key={t(skill)}>{t(skill)}</span>
              ))}
            </div>
            <div className="dialog-note">
              {" "}
              {t(
                "Les mises en relation seront accessibles dans une prochaine étape de la plateforme.",
              )}{" "}
            </div>
          </>
        )}
        {article && (
          <>
            <div className="eyebrow">
              {t(article.category)} · {t(article.duration)}
            </div>
            <h2 id="detail-title">{t(article.title)}</h2>
            <p className="article-body">{t(article.text)}</p>
          </>
        )}
      </dialog>
      <dialog ref={setupDialog} className="detail-dialog" aria-labelledby="setup-title">
        <button
          className="dialog-close icon-button"
          aria-label={t("Fermer")}
          onClick={() => setupDialog.current?.close()}
        >
          <Icon name="close" />
        </button>
        <div className="eyebrow">{t("VOTRE PREMIER PAS")}</div>
        <h2 id="setup-title">{t("Faisons connaissance.")}</h2>
        <p>
          {" "}
          {t(
            "Personnalisez cet aperçu avec votre prénom. Cette étape ne crée pas de compte ; le prénom reste dans cette session.",
          )}{" "}
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const value = draftName.trim();
            if (!value) return;
            setName(value);
            setupDialog.current?.close();
          }}
        >
          <label className="form-label" htmlFor="first-name">
            {" "}
            {t("Votre prénom")}{" "}
          </label>
          <input
            id="first-name"
            className="form-input"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            required
            maxLength={35}
            autoComplete="given-name"
          />
          <button className="button button-forest" type="submit">
            {" "}
            {t("Personnaliser mon espace")} <Icon name="arrow" size={18} />
          </button>
        </form>
      </dialog>
    </div>
  );
}
