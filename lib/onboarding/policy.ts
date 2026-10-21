import "server-only";

export const MAX_CERTIFICATION_BYTES = 5 * 1024 * 1024;

export function isCertificationTestMode() {
  return process.env.NODE_ENV !== "production" && process.env.CERTIFICATION_TEST_MODE === "true";
}

/** Simulated evidence never grants access outside the explicitly enabled local test mode. */
export function approvedCertificationFilter() {
  return {
    verificationStatus: "APPROVED" as const,
    scanStatus: "CLEAN" as const,
    withdrawnAt: null,
    ...(isCertificationTestMode() ? {} : { isTest: false }),
  };
}
