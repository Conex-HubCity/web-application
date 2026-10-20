import Image from "next/image";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icon";
import { ReplayIntroduction, SplashScreen } from "@/components/splash-screen";
import { HomeSections } from "@/components/home-sections";
import "./home-sections.css";

export default function Home() {
  return (
    <div className="welcome-page">
      <SplashScreen />
      <a className="skip-link" href="#welcome-main">Aller au contenu</a>
      <header className="welcome-header welcome-public-header welcome-container">
        <Brand />
        <nav className="welcome-nav" aria-label="Navigation principale"><a href="#les-parcours">Les parcours</a><a href="#comment-ca-marche">Comment ça marche</a><a href="#questions-frequentes">FAQ</a><Link href="/connexion" className="welcome-login">Se connecter <Icon name="diagonal" size={16} /></Link></nav>
      </header>
      <main id="welcome-main">
      <section className="welcome-masthead" aria-labelledby="welcome-title">
        <div className="welcome-hero-image"><Image className="welcome-hero-background" src="/assets/conex/jeune-fondatrice.webp" alt="Illustration d’une jeune entrepreneure regardant vers l’avenir" fill sizes="100vw" preload /></div>
        <div className="welcome-hero-shade" aria-hidden="true" />
        <div className="welcome-hero-grain" aria-hidden="true" />
        <div className="welcome-hero welcome-container">
          <div className="welcome-hero-copy">
            <div className="welcome-eyebrow"><span /> L’AFRIQUE ET SA DIASPORA, EN LIEN</div>
            <h1 id="welcome-title">Un projet.<br />Une expérience.<br /><em>Un lien pour grandir.</em></h1>
            <p className="welcome-lead">Les bonnes rencontres ouvrent de nouveaux possibles. Conex relie les entrepreneurs africains aux professionnels de la diaspora pour avancer ensemble.</p>
            <div className="welcome-hero-actions" aria-label="Choisir mon parcours">
              <Link className="hero-join hero-join-founder" href="/inscription/porteur">Je porte un projet <span><Icon name="diagonal" size={18} /></span></Link>
              <Link className="hero-join hero-join-mentor" href="/inscription/mentor">Devenir mentor <Icon name="arrow" size={18} /></Link>
            </div>
            <p className="welcome-existing">Déjà membre ou mentor ? <Link href="/connexion">Connectez-vous <span aria-hidden="true">↗</span></Link></p>
            <div className="welcome-hero-ethos"><span>TRANSMISSION</span><i aria-hidden="true" /><span>RENCONTRE</span><i aria-hidden="true" /><span>COMPAGNONNAGE</span></div>
          </div>
          <div className="welcome-seal" aria-label="CNX, Afrique et diaspora : le lien nous élève"><span>AFRIQUE · DIASPORA</span><strong>CNX</strong><span>LE LIEN NOUS ÉLÈVE</span></div>
          <span className="welcome-side-note">Plus loin, ensemble.</span>
          <div className="welcome-hero-baseline"><span>LE TALENT EST PARTOUT. CRÉONS LES LIENS.</span><a href="#comment-ca-marche">Comment ça marche <Icon name="arrow" size={16} /></a></div>
        </div>
      </section>
        <section className="welcome-prerequisite welcome-container" aria-label="Prérequis du parcours entrepreneur"><span className="prerequisite-icon"><Icon name="compass" size={21} /></span><p><strong>Votre compte est le premier pas.</strong> Vous pouvez le créer avant d’être certifié. La certification WoeAcademy Niveau Rouge est nécessaire pour valider votre profil ; votre projet fera ensuite l’objet d’une validation distincte.</p><a href="#comment-ca-marche" aria-label="Comprendre les étapes du parcours"><Icon name="arrow" size={20} /></a></section>
        <HomeSections />
      </main>
      <footer className="welcome-footer welcome-container"><div><Brand /><p>Un réseau de confiance.<br />Une ambition partagée.</p></div><div className="welcome-footer-actions"><ReplayIntroduction /><Link href="/connexion">Accéder à mon espace <Icon name="arrow" size={15} /></Link><span>© 2026 Conex · A solution by HubCity</span></div></footer>
    </div>
  );
}
