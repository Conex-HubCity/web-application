import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Brand } from "@/components/brand";
import { Link } from "@/components/i18n";
import { logout } from "@/app/actions/auth";
import { ProjectPresentation } from "@/components/project-presentation";
import { getAuthenticatedProfile } from "@/lib/onboarding/profile";
import { getTranslator } from "@/lib/i18n/server";
import { getFounderProjectPresentation } from "@/lib/domain/project-catalogue";
import { DomainError } from "@/lib/domain/policies";
import "@/app/project-catalogue.css";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("Présentation du projet — CNX"), robots: { index: false, follow: false } };
}
export default async function FounderProjectPreview() {
  const user = await getAuthenticatedProfile();
  const project = await getFounderProjectPresentation(user.id).catch((error) => {
    if (error instanceof DomainError && error.code === "FOUNDER_UNAVAILABLE") notFound();
    throw error;
  });
  if (!project) notFound();
  const t = await getTranslator();
  return (
    <div className="pc-page">
      <a className="skip-link" href="#project-main">
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
      <main id="project-main">
        <ProjectPresentation project={project} audience="founder" />
      </main>
    </div>
  );
}
