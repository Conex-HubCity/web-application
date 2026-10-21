import "server-only";

export function mentorDestination(profile: {
  isMentor: boolean;
  isMentorApproved: boolean;
  mentorStatus: string;
  mentorDocuments: readonly unknown[];
}): "/mentor/candidature" | "/mentor/validation" | null {
  if (!profile.isMentor || profile.isMentorApproved) return null;
  if (profile.mentorDocuments.length === 0) return "/mentor/candidature";
  return ["PENDING", "IN_REVIEW", "APPROVED"].includes(profile.mentorStatus)
    ? "/mentor/validation"
    : "/mentor/candidature";
}
