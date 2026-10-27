import "server-only";

/** Set at build and runtime; keep private so public props and server guards share one switch. */
export function isMentorPreviewEnabled(value = process.env.MENTOR_PREVIEW_MODE) {
  return value === "true";
}

export function previewRoleAllowed(roles: readonly { role: string }[]) {
  return roles.some(({ role }) => role === "MENTOR" || role === "ADMIN");
}
