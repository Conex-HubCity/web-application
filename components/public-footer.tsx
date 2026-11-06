import Image from "next/image";
import { Icon } from "@/components/icon";
import { Brand } from "@/components/brand";
import { Link } from "@/components/i18n";
import { ReplayIntroduction } from "@/components/splash-screen";
import { getTranslator } from "@/lib/i18n/server";
import { CONTACT_EMAIL } from "@/lib/contact";

export async function PublicFooter() {
  const t = await getTranslator();
  return (
    <footer id="pied-de-page" className="welcome-footer cnx-public-footer cnx-section">
      <div className="welcome-container cnx-footer-content">
        <div className="cnx-footer-brand">
          <Brand full showLanguageSwitcher={false} />
          <p>
            {t(
              "Être le plus grand répertoire de talents africains : Un réseau de confiance avec des ambitions partagées.",
            )}
          </p>
        </div>
        <nav className="cnx-footer-column" aria-label={t("Explorer CNX")}>
          <h2>{t("Explorer")}</h2>
          <Link href="/#formation">{t("La formation")}</Link>
          <Link href="/#choix">{t("Choisir mon parcours")}</Link>
          <Link href="/#questions-frequentes">{t("Questions fréquentes")}</Link>
          <Link href="/connexion">{t("Accéder à mon espace")}</Link>
        </nav>
        <div className="cnx-footer-column" id="contact">
          <h2>{t("Nous contacter")}</h2>
          <a className="cnx-footer-email" href={`mailto:${CONTACT_EMAIL}`}>
            <Icon name="mail" size={18} />
            <span>{CONTACT_EMAIL}</span>
          </a>
        </div>
        <nav className="cnx-footer-column" aria-label={t("Informations utiles")}>
          <h2>{t("Informations utiles")}</h2>
          <Link href="/confidentialite">{t("Politique de confidentialité")}</Link>
          <Link href="/charte-mentorat">{t("Charte du mentorat")}</Link>
          <ReplayIntroduction />
        </nav>
        <nav className="cnx-footer-column cnx-footer-socials" aria-label={t("Réseaux sociaux")}>
          <h2>{t("Réseaux sociaux")}</h2>
          <a href="https://www.facebook.com/Cnxhubcity" target="_blank" rel="noopener noreferrer">
            <Icon name="facebook" size={18} /> Facebook
          </a>
          <a
            href="https://www.instagram.com/cnxhubcity/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="instagram" size={18} /> Instagram
          </a>
          <a
            href="https://linkedin.com/company/cnxhubcity/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="linkedin" size={18} /> LinkedIn
          </a>
          <a
            className="cnx-footer-gpt-link"
            href="https://chatgpt.com/g/g-68ed8ab7f3408191ba034341e751e74c-hubcity"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="cnx-footer-gpt-logo"
              src="/assets/conex/chatgpt-logo.png"
              alt=""
              width={18}
              height={18}
            />
            GPT HubCity
          </a>
        </nav>
      </div>
      <div className="cnx-footer-visual">
        <Image
          className="cnx-footer-meeting"
          src="/assets/conex/footer-cafe-wide-v2.webp"
          alt={t("Deux personnes échangent autour d’un projet et d’un ordinateur.")}
          fill
          sizes="100vw"
        />
      </div>
      <span className="cnx-footer-copyright">© 2026 CNX · by HubCity</span>
    </footer>
  );
}
