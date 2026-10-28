import "server-only";

export function mentorDestination(profile: {
  isMentor: boolean;
  hasContribution: boolean;
  isMentorApproved: boolean;
  mentorStatus: string;
  mentorDocuments: readonly unknown[];
}): "/contribution" | "/mentor/candidature" | "/mentor/validation" | null {
  if (!profile.isMentor) return null;
  if (!profile.hasContribution) return "/contribution";
  if (profile.isMentorApproved) return null;
  if (profile.mentorDocuments.length === 0) return "/mentor/candidature";
  return ["PENDING", "IN_REVIEW", "APPROVED"].includes(profile.mentorStatus)
    ? "/mentor/validation"
    : "/mentor/candidature";
}
