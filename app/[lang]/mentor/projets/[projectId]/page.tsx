import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectPresentation } from "@/components/project-presentation";
import { getAuthenticatedProfile } from "@/lib/onboarding/profile";
import { getTranslator } from "@/lib/i18n/server";
import { getProjectPresentation } from "@/lib/domain/project-catalogue";
import { DomainError } from "@/lib/domain/policies";
import "@/app/project-catalogue.css";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("Présentation du projet — CNX"), robots: { index: false, follow: false } };
}
export default async function MentorProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getAuthenticatedProfile();
  const { projectId } = await params;
  const project = await getProjectPresentation(user.id, projectId).catch((error) => {
    if (error instanceof DomainError && error.code === "CATALOGUE_FORBIDDEN") notFound();
    throw error;
  });
  if (!project) notFound();
  return <ProjectPresentation project={project} audience="mentor" />;
}
