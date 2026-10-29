import { Suspense, type ReactNode } from "react";
import { MentorShell } from "@/components/mentor-shell";
import AuthLoading from "@/components/auth-loading";
import { getAuthenticatedProfile } from "@/lib/onboarding/profile";
import { notFound } from "next/navigation";
import { requireProjectCatalogueMentor } from "@/lib/domain/project-catalogue";
import { DomainError } from "@/lib/domain/policies";
async function ProjectWorkspace({ children }: { children: ReactNode }) {
  const profile = await getAuthenticatedProfile();
  await requireProjectCatalogueMentor(profile.id).catch((error) => {
    if (error instanceof DomainError && error.code === "CATALOGUE_FORBIDDEN") notFound();
    throw error;
  });
  return (
    <MentorShell
      data={{
        firstName: profile.firstName,
        lastName: profile.lastName,
      }}
      view="projects"
    >
      {children}
    </MentorShell>
  );
}
export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AuthLoading />}>
      <ProjectWorkspace>{children}</ProjectWorkspace>
    </Suspense>
  );
}
