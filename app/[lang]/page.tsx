import { Suspense } from "react";
import { getFounderRegistrationEnabled } from "@/lib/registration";
import type { Metadata } from "next";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import Image from "next/image";
import { Link } from "@/components/i18n";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icon";
import { SplashScreen } from "@/components/splash-screen";
import { PublicFooter } from "@/components/public-footer";
import { HomeSections } from "@/components/home-sections";
import "@/app/home-sections.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title:
      locale === "en" ? "Connex — Connections that help us grow" : "Connex — Le lien nous élève",
  };
}

export default function Home() {
  return (
    <Suspense fallback={<div className="welcome-page" aria-busy="true" />}>
      <HomeContent />
    </Suspense>
  );
}
async function HomeContent() {
  const t = await getTranslator();
  const founderRegistrationClosed = !(await getFounderRegistrationEnabled());
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
          <a href="#formation">{t("La formation")}</a>
          <a href="#choix">{t("Les parcours")}</a>
          <a href="#questions-frequentes">FAQ</a>
          <Link href="/connexion" className="welcome-login">
            {" "}
            {t("Se connecter")} <Icon name="diagonal" size={16} />
          </Link>
        </nav>
      </header>
      <main id="welcome-main">
        {founderRegistrationClosed && (
          <p className="welcome-preview-notice welcome-container">
            {t(
              "Les inscriptions Mentee sont actuellement fermées. Les candidatures mentors restent ouvertes.",
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
              <h1 id="welcome-title">
                {" "}
                {t("Un projet.")} <br /> {t("Une expérience.")} <br />
                <em>{t("Un lien pour grandir.")}</em>
              </h1>
              <p className="welcome-lead">
                {" "}
                {t(
                  "Les bonnes rencontres ouvrent de nouveaux possibles. Connex relie les Mentees africains aux professionnels de la diaspora pour avancer ensemble.",
                )}{" "}
              </p>
            </div>
          </div>
        </section>
        <HomeSections founderRegistrationClosed={founderRegistrationClosed} />
      </main>
      <PublicFooter />
    </div>
  );
}
