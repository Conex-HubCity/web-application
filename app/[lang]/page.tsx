import { Suspense } from "react";
import { getFounderRegistrationEnabled } from "@/lib/registration";
import type { Metadata } from "next";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import Image from "next/image";
import { Link } from "@/components/i18n";
import { Brand } from "@/components/brand";
import { SplashScreen } from "@/components/splash-screen";
import { PublicFooter } from "@/components/public-footer";
import { HomeSections } from "@/components/home-sections";
import { FragmentScroll } from "@/components/fragment-scroll";
import { SectionNavigation } from "@/components/section-navigation";
import "@/app/home-sections.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: locale === "en" ? "CNX — Connections that help us grow" : "CNX — Le lien nous élève",
  };
}

export default function Home() {
  return (
    <>
      <FragmentScroll />
      <Suspense fallback={<div className="welcome-page" aria-busy="true" />}>
        <HomeContent />
      </Suspense>
    </>
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
        <Brand full label={t("PLATEFORME DE MENTORAT")} />
        <nav className="welcome-nav" aria-label={t("Navigation principale")}>
          <a href="#choix">{t("Les parcours")}</a>
          <Link href="/connexion" className="welcome-login">
            {" "}
            {t("Se connecter")}
          </Link>
        </nav>
      </header>
      <main id="welcome-main">
        <section id="accueil" className="welcome-masthead" aria-labelledby="welcome-title">
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
            <div className="welcome-hero-copy welcome-hero-purpose">
              <h1 id="welcome-title">
                {t('Réaliser l’"Afrique Mondiale"')}{" "}
                <em>{t("au service du dividende démographique.")}</em>
              </h1>
              <p className="welcome-hero-context">
                {t(
                  "Notre ambition : jeter un pont pour construire ensemble, agir sur et par son capital humain pour adresser les enjeux de transformation du continent africain.",
                )}
              </p>
              <p className="welcome-hero-context">
                {t(
                  "CNX est un ambitieux programme de mentorat qui relie des primo-entrepreneurs du continent à des professionnels de la diaspora qui souhaitent partager leur expérience.",
                )}
              </p>
            </div>
          </div>
        </section>
        <HomeSections founderRegistrationClosed={founderRegistrationClosed} />
      </main>
      <PublicFooter />
      <SectionNavigation />
    </div>
  );
}
