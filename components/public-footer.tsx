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
    <footer className="welcome-footer welcome-container cnx-public-footer">
      <div className="cnx-footer-brand">
        <Brand full />
        <p>
          {t(
            "Être le plus grand répertoire de talents africains : Un réseau de confiance avec des ambitions partagées.",
          )}
        </p>
        <span className="cnx-footer-copyright">© 2026 CNX · A solution by HubCity</span>
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
        <span>{t("Une question sur CNX ou votre candidature ? Écrivez-nous.")}</span>
        <nav className="cnx-footer-socials" aria-label={t("Réseaux sociaux")}>
          <a href="https://www.facebook.com/Cnxhubcity" target="_blank" rel="noopener noreferrer">
            <Icon name="facebook" size={18} /> Facebook
          </a>
          <a href="https://www.instagram.com/cnxhubcity/" target="_blank" rel="noopener noreferrer">
            <Icon name="instagram" size={18} /> Instagram
          </a>
        </nav>
      </div>
      <nav className="cnx-footer-column" aria-label={t("Informations utiles")}>
        <h2>{t("Informations utiles")}</h2>
        <Link href="/confidentialite">{t("Politique de confidentialité")}</Link>
        <Link href="/charte-mentorat">{t("Charte du mentorat")}</Link>
        <ReplayIntroduction />
      </nav>
      <Image
        className="cnx-footer-meeting"
        src="/assets/conex/rencontre.webp"
        alt={t("Deux personnes échangent autour d’un projet et d’un ordinateur.")}
        width={765}
        height={506}
        sizes="160px"
      />
    </footer>
  );
}
