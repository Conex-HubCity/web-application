export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const PROJECT_REPLACEMENT_DELAY_MS = 30 * 24 * 60 * 60 * 1000;

export function requireCondition(
  condition: unknown,
  code: string,
  message: string,
): asserts condition {
  if (!condition) throw new DomainError(code, message);
}

export function requiredText(value: unknown, label: string): string {
  requireCondition(typeof value === "string", "INVALID_INPUT", `${label} est obligatoire.`);
  const result = value.trim();
  requireCondition(result.length > 0, "INVALID_INPUT", `${label} est obligatoire.`);
  return result;
}

export function normalizeEmail(email: string): string {
  return requiredText(email, "L’email").toLowerCase();
}

export function assertProjectReplacement(input: {
  hasOpenMentorship: boolean;
  submittedAt: Date | null;
  lastFollowUpAt: Date | null;
  now: Date;
}): void {
  requireCondition(
    !input.hasOpenMentorship,
    "MENTORSHIP_OPEN",
    "Le compagnonnage doit d’abord être clôturé.",
  );
  requireCondition(
    input.submittedAt,
    "PROJECT_NOT_SUBMITTED",
    "Modifiez le brouillon avant sa première soumission.",
  );
  const reference = Math.max(input.submittedAt.getTime(), input.lastFollowUpAt?.getTime() ?? 0);
  requireCondition(
    input.now.getTime() - reference >= PROJECT_REPLACEMENT_DELAY_MS,
    "REPLACEMENT_TOO_EARLY",
    "Le remplacement exige au moins 30 jours sans suivi.",
  );
}

export function assertFileMetadata(file: {
  originalFilename: string;
  privateStorageKey: string;
  mimeType: string;
  sizeBytes: bigint;
  checksum: string;
}): void {
  requiredText(file.originalFilename, "Le nom de fichier");
  requiredText(file.privateStorageKey, "La référence privée");
  requiredText(file.mimeType, "Le type de fichier");
  requireCondition(
    file.sizeBytes > BigInt(0) && /^[a-f0-9]{64}$/.test(file.checksum),
    "INVALID_FILE",
    "Métadonnées de fichier invalides.",
  );
}
