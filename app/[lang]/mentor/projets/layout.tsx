import { Suspense, type ReactNode } from "react";
import { MentorShell } from "@/components/mentor-shell";
import AuthLoading from "@/components/auth-loading";
import { getAuthenticatedProfile } from "@/lib/onboarding/profile";
import { getDb } from "@/lib/db";
async function ProjectWorkspace({ children }: { children: ReactNode }) {
  const profile = await getAuthenticatedProfile();
  if (!profile.isMentor || !profile.isMentorApproved || !profile.hasContribution) return children;
  const now = new Date();
  const membership = await getDb().membership.findFirst({
    where: {
      mentorUserId: profile.id,
      status: "ACTIVE",
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    select: { id: true },
  });
  return (
    <MentorShell
      data={{
        firstName: profile.firstName,
        lastName: profile.lastName,
        membershipActive: Boolean(membership),
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
