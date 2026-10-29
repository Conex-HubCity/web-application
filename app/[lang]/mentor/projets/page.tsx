import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { Link } from "@/components/i18n";
import { ProjectCatalogue } from "@/components/project-catalogue";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { listProjectPresentations } from "@/lib/domain/project-catalogue";
import { DomainError } from "@/lib/domain/policies";
import "@/app/project-catalogue.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("Les projets — CNX"), robots: { index: false, follow: false } };
}
export default async function MentorProjects() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) redirect(localizePath("/connexion", locale));
  const projects = await listProjectPresentations(user.id).catch((error) => {
    if (error instanceof DomainError && error.code === "CATALOGUE_FORBIDDEN")
      redirect(localizePath("/compte", locale));
    throw error;
  });
  const t = await getTranslator();
  return (
    <div className="pc-page">
      <a className="skip-link" href="#projects-main">
        {t("Aller au contenu")}
      </a>
      <header className="pc-header">
        <Brand />
        <nav aria-label={t("Navigation de mon espace")}>
          <Link href="/compte">{t("Mon espace")}</Link>
          <form action={logout}>
            <button type="submit">{t("Se déconnecter")}</button>
          </form>
        </nav>
      </header>
      <main id="projects-main" className="pc-main">
        <div className="pc-page-heading">
          <span className="pc-eyebrow">{t("LES PROJETS DE LA COMMUNAUTÉ")}</span>
          <h1>
            {t("Des projets à")} <em>{t("faire grandir.")}</em>
          </h1>
          <p>{t("Découvrez les idées et les porteurs qui font vivre CNX.")}</p>
        </div>
        <ProjectCatalogue projects={projects} />
      </main>
    </div>
  );
}
