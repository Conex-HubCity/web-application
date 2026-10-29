import { isMentorPreviewEnabled, isFounderRegistrationEnabled } from "@/lib/release";
import type { Metadata } from "next";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import Image from "next/image";
import { Link } from "@/components/i18n";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icon";
import { ReplayIntroduction, SplashScreen } from "@/components/splash-screen";
import { HomeSections } from "@/components/home-sections";
import "@/app/home-sections.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title:
      locale === "en" ? "Connex — Connections that help us grow" : "Connex — Le lien nous élève",
  };
}

export default async function Home() {
  const t = await getTranslator();
  const mentorPreview = isMentorPreviewEnabled() || !isFounderRegistrationEnabled();
  return (
    <div className="welcome-page">
      <SplashScreen />
      <a className="skip-link" href="#welcome-main">
        {" "}
        {t("Aller au contenu")}{" "}
      </a>
      <header className="welcome-header welcome-public-header welcome-container">
        <Brand full />
        <nav className="welcome-nav" aria-label={t("Navigation principale")}>
          <a href="#les-parcours">{t("Les parcours")}</a>
          <a href="#comment-ca-marche">{t("Comment ça marche")}</a>
          <a href="#questions-frequentes">FAQ</a>
          <Link href="/connexion" className="welcome-login">
            {" "}
            {t("Se connecter")} <Icon name="diagonal" size={16} />
          </Link>
        </nav>
      </header>
      <main id="welcome-main">
        {mentorPreview && (
          <p className="welcome-preview-notice welcome-container">
            {t(
              "Les candidatures mentors sont ouvertes. Le parcours porteur de projet sera disponible prochainement.",
            )}
          </p>
        )}
        <section className="welcome-masthead" aria-labelledby="welcome-title">
          <div className="welcome-hero-image">
            <Image
              className="welcome-hero-background"
              src="/assets/conex/jeune-fondatrice.webp"
              alt={t("Illustration d’une jeune entrepreneure regardant vers l’avenir")}
              fill
              sizes="100vw"
              preload
            />
          </div>
          <div className="welcome-hero-shade" aria-hidden="true" />
          <div className="welcome-hero-grain" aria-hidden="true" />
          <div className="welcome-hero welcome-container">
            <div className="welcome-hero-copy">
              <div className="welcome-eyebrow">
                <span /> {t("L’AFRIQUE ET SA DIASPORA, EN LIEN")}{" "}
              </div>
              <h1 id="welcome-title">
                {" "}
                {t("Un projet.")} <br /> {t("Une expérience.")} <br />
                <em>{t("Un lien pour grandir.")}</em>
              </h1>
              <p className="welcome-lead">
                {" "}
                {t(
                  "Les bonnes rencontres ouvrent de nouveaux possibles. Connex relie les entrepreneurs africains aux professionnels de la diaspora pour avancer ensemble.",
                )}{" "}
              </p>
              {mentorPreview ? (
                <div className="welcome-hero-actions">
                  <Link className="hero-join hero-join-founder" href="/inscription/mentor">
                    {t("Devenir mentor")}{" "}
                    <span>
                      <Icon name="diagonal" size={18} />
                    </span>
                  </Link>
                </div>
              ) : (
                <div className="welcome-hero-actions" aria-label={t("Choisir mon parcours")}>
                  <Link className="hero-join hero-join-founder" href="/inscription/porteur">
                    {" "}
                    {t("Je porte un projet")}{" "}
                    <span>
                      <Icon name="diagonal" size={18} />
                    </span>
                  </Link>
                  <Link className="hero-join hero-join-mentor" href="/inscription/mentor">
                    {" "}
                    {t("Devenir mentor")} <Icon name="arrow" size={18} />
                  </Link>
                </div>
              )}
              <p className="welcome-existing">
                {" "}
                {t(mentorPreview ? "Déjà inscrit comme mentor ?" : "Déjà membre ou mentor ?")}{" "}
                <Link href="/connexion">
                  {" "}
                  {t("Connectez-vous")} <span aria-hidden="true">↗</span>
                </Link>
              </p>
              <div className="welcome-hero-ethos">
                <span>{t("TRANSMISSION")}</span>
                <i aria-hidden="true" />
                <span>{t("RENCONTRE")}</span>
                <i aria-hidden="true" />
                <span>{t("COMPAGNONNAGE")}</span>
              </div>
            </div>
            <div
              className="welcome-seal"
              aria-label={t("CNX, Afrique et diaspora : le lien nous élève")}
            >
              <span>{t("AFRIQUE · DIASPORA")}</span>
              <strong>CNX</strong>
              <span>{t("LE LIEN NOUS ÉLÈVE")}</span>
            </div>
            <span className="welcome-side-note">{t("Plus loin, ensemble.")}</span>
            <div className="welcome-hero-baseline">
              <span>{t("LE TALENT EST PARTOUT. CRÉONS LES LIENS.")}</span>
              <a href="#comment-ca-marche">
                {" "}
                {t("Comment ça marche")} <Icon name="arrow" size={16} />
              </a>
            </div>
          </div>
        </section>
        {!mentorPreview && (
          <section
            className="welcome-prerequisite welcome-container"
            aria-label={t("Prérequis du parcours entrepreneur")}
          >
            <span className="prerequisite-icon">
              <Icon name="compass" size={21} />
            </span>
            <p>
              <strong>{t("Votre compte est le premier pas.")}</strong>{" "}
              {t(
                "Vous pouvez le créer avant d’être certifié. La certification WoeAcademy Niveau Rouge est nécessaire pour valider votre profil ; votre projet fera ensuite l’objet d’une validation distincte.",
              )}{" "}
            </p>
            <a href="#comment-ca-marche" aria-label={t("Comprendre les étapes du parcours")}>
              <Icon name="arrow" size={20} />
            </a>
          </section>
        )}
        <HomeSections mentorPreview={mentorPreview} />
      </main>
      <footer className="welcome-footer welcome-container">
        <div>
          <Brand full />
          <p>
            {" "}
            {t("Un réseau de confiance.")} <br /> {t("Une ambition partagée.")}{" "}
          </p>
        </div>
        <div className="welcome-footer-actions">
          <ReplayIntroduction />
          <Link href="/connexion">
            {" "}
            {t("Accéder à mon espace")} <Icon name="arrow" size={15} />
          </Link>
          <span>© 2026 Connex · A solution by HubCity</span>
        </div>
      </footer>
    </div>
  );
}
