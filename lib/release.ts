import "server-only";
/** Public founder signup is controlled independently of the implemented dashboards. */
export function isFounderRegistrationEnabled(value = process.env.FOUNDER_REGISTRATION_ENABLED) {
  return value === "true";
}
