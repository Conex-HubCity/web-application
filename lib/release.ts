import "server-only";

/** Set at build and runtime; keep private so public props and server guards share one switch. */
export function isMentorPreviewEnabled(value = process.env.MENTOR_PREVIEW_MODE) {
  return value === "true";
}

export function previewRoleAllowed(roles: readonly { role: string }[], invitationAccepted = false) {
  return roles.some(
    ({ role }) =>
      role === "MENTOR" || role === "ADMIN" || (role === "FOUNDER" && invitationAccepted),
  );
}

/** Public founder signup stays closed unless explicitly enabled, independently of preview mode. */
export function isFounderRegistrationEnabled(value = process.env.FOUNDER_REGISTRATION_ENABLED) {
  return value === "true";
}
