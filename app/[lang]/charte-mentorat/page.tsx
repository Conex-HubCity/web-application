import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { Link } from "@/components/i18n";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import sections from "@/lib/content/mentor-charter.json";
import { MENTOR_CHARTER_DOCUMENT, MENTOR_CHARTER_VERSION } from "@/lib/mentor-charter";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("Charte du mentorat — Hubcity") };
}

export default async function MentorCharter() {
  const t = await getTranslator();
  const locale = await getLocale();
  return (
    <div className="charter-page">
      <header className="welcome-header welcome-container">
        <Brand />
        <Link className="auth-back" href="/">
          {t("Revenir à l’accueil")}
        </Link>
      </header>
      <main className="charter-main welcome-container">
        <h1>{t("Charte du mentorat de Hubcity")}</h1>
        <p className="charter-actions">
          <a href={MENTOR_CHARTER_DOCUMENT} download>
            {t("Télécharger la charte (Word)")}
          </a>
          <Link href="/inscription/mentor">{t("Devenir mentor")}</Link>
        </p>
        {locale === "en" && <p>{t("Le texte de référence de cette charte est en français.")}</p>}
        <article lang="fr" data-charter-version={MENTOR_CHARTER_VERSION}>
          {sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((text, index) => (
                <p key={index}>{text}</p>
              ))}
            </section>
          ))}
        </article>
      </main>
    </div>
  );
}
