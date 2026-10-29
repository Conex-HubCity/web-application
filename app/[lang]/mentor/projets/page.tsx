import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProjectCatalogue } from "@/components/project-catalogue";
import { getAuthenticatedProfile } from "@/lib/onboarding/profile";
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
  const user = await getAuthenticatedProfile();
  const locale = await getLocale();
  if (!user) redirect(localizePath("/connexion", locale));
  const projects = await listProjectPresentations(user.id).catch((error) => {
    if (error instanceof DomainError && error.code === "CATALOGUE_FORBIDDEN")
      redirect(localizePath("/compte", locale));
    throw error;
  });
  const t = await getTranslator();
  return (
    <div className="pc-main pc-workspace-content">
      <div className="pc-page-heading">
        <span className="pc-eyebrow">{t("LES PROJETS DE LA COMMUNAUTÉ")}</span>
        <h1>
          {t("Des projets à")} <em>{t("faire grandir.")}</em>
        </h1>
        <p>{t("Découvrez les idées et les porteurs qui font vivre CNX.")}</p>
      </div>
      <ProjectCatalogue projects={projects} />
    </div>
  );
}
