import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { Link } from "@/components/i18n";
import { PublicFooter } from "@/components/public-footer";
import { getTranslator } from "@/lib/i18n/server";
import { CONTACT_EMAIL } from "@/lib/contact";
import sections from "@/lib/content/privacy.json";
import "@/app/home-sections.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: `${t("Politique de confidentialité")} — CNX` };
}

export default async function PrivacyPage() {
  const t = await getTranslator();
  return (
    <div className="welcome-page cnx-privacy-page">
      <header className="welcome-header welcome-container">
        <Brand full />
        <Link className="auth-back" href="/">
          {t("Revenir à l’accueil")}
        </Link>
      </header>
      <main className="welcome-container cnx-privacy-main">
        <div className="cnx-section-heading">
          <p className="welcome-eyebrow">{t("Politique de confidentialité")}</p>
          <h1>{t("Vos données, en toute clarté.")}</h1>
          <p>
            {t(
              "Cette politique décrit l’utilisation de vos données sur CNX, la plateforme de mentorat portée par HubCity.",
            )}
          </p>
          <p className="cnx-privacy-date">{t("Dernière mise à jour : 5 novembre 2026")}</p>
        </div>
        <article>
          {sections.map((section) => (
            <section key={section.title}>
              <h2>{t(section.title)}</h2>
              {section.paragraphs.map((text) => (
                <p key={text}>{t(text)}</p>
              ))}
              {section.title.startsWith("3.") && (
                <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">
                  {t("Consulter la politique de confidentialité de Stripe")} ↗
                </a>
              )}
              {section.title.startsWith("6.") && (
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              )}
            </section>
          ))}
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
