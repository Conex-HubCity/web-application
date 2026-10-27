import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { AuthError } from "@/lib/auth/service";

export const MAX_MENTOR_UPLOAD_BYTES = 5 * 1024 * 1024;
const formats: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

type MentorSubmission = {
  documents: { file: File; documentType: "CV" | "OTHER_EVIDENCE" }[];
  charterAccepted: boolean;
  professionalTitle?: unknown;
  biography?: unknown;
};

function hasSignature(buffer: Buffer, extension: string) {
  if (extension === "pdf") return buffer.subarray(0, 5).toString() === "%PDF-";
  if (extension === "png") return buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  if (["jpg", "jpeg"].includes(extension))
    return buffer.subarray(0, 3).toString("hex") === "ffd8ff";
  if (extension === "doc") return buffer.subarray(0, 8).toString("hex") === "d0cf11e0a1b11ae1";
  if (extension === "docx") return buffer.subarray(0, 4).toString("hex") === "504b0304";
  return (
    buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP"
  );
}

export function createMentorOnboardingService(
  db: PrismaClient = getDb(),
  directory = path.join(process.cwd(), "uploads", "private", "mentors"),
) {
  return {
    async submit(userId: string, input: MentorSubmission, additionalDocuments = false) {
      if (!additionalDocuments && !input.charterAccepted)
        throw new AuthError("Veuillez accepter les engagements du mentor.");
      if (
        !Array.isArray(input.documents) ||
        input.documents.length < 1 ||
        input.documents.length > 5
      )
        throw new AuthError("Déposez entre un et cinq documents.");
      if (input.documents.some(({ file }) => !(file instanceof File) || file.size === 0))
        throw new AuthError("Choisissez des documents non vides.");
      if (
        input.documents.reduce((total, { file }) => total + file.size, 0) > MAX_MENTOR_UPLOAD_BYTES
      )
        throw new AuthError("L’ensemble des documents ne doit pas dépasser 5 Mo.");
      const professionalTitle =
        typeof input.professionalTitle === "string" ? input.professionalTitle.trim() : "";
      const biography = typeof input.biography === "string" ? input.biography.trim() : "";
      if (professionalTitle.length > 200 || biography.length > 4000)
        throw new AuthError("La présentation de votre expérience est trop longue.");
      const prepared = await Promise.all(
        input.documents.map(async ({ file, documentType }) => {
          if (!["CV", "OTHER_EVIDENCE"].includes(documentType))
            throw new AuthError("Type de justificatif invalide.");
          const originalFilename = file.name
            .split(/[\\/]/)
            .pop()!
            .replace(/[\u0000-\u001f\u007f]/g, "")
            .trim()
            .slice(0, 255);
          const extension = originalFilename.split(".").pop()!.toLowerCase();
          if (!formats[extension])
            throw new AuthError("Utilisez un PDF, un document Word ou une image JPG, PNG ou WebP.");
          const buffer = Buffer.from(await file.arrayBuffer());
          if (!hasSignature(buffer, extension))
            throw new AuthError("Le contenu d’un document ne correspond pas à son format.");
          const id = randomUUID();
          return {
            buffer,
            id,
            metadata: {
              documentType,
              originalFilename,
              mimeType: formats[extension],
              privateStorageKey: `mentors/${id}`,
              sizeBytes: BigInt(buffer.length),
              checksum: createHash("sha256").update(buffer).digest("hex"),
            },
          };
        }),
      );
      const written: string[] = [];
      let committed = false;
      try {
        await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
          const user = await tx.user.findUnique({
            where: { id: userId },
            include: {
              roles: true,
              mentorProfile: {
                include: { documents: { where: { withdrawnAt: null }, select: { id: true } } },
              },
            },
          });
          if (
            !user ||
            ["SUSPENDED", "CLOSED"].includes(user.accountStatus) ||
            !user.roles.some(({ role }) => role === "MENTOR") ||
            !user.mentorProfile
          )
            throw new AuthError("Ce dépôt est réservé aux mentors connectés.");
          const profile = user.mentorProfile;
          if (
            additionalDocuments &&
            (profile.verificationStatus !== "APPROVED" || !profile.charterAcceptedAt)
          )
            throw new AuthError("Votre candidature doit être validée avant cet ajout.");
          if (!additionalDocuments && profile.verificationStatus === "APPROVED")
            throw new AuthError("Votre candidature est déjà validée.");
          if (
            !additionalDocuments &&
            ["PENDING", "IN_REVIEW"].includes(profile.verificationStatus) &&
            profile.documents.length > 0
          )
            return;
          if (profile.documents.length + prepared.length > 20)
            throw new AuthError(
              "Vous avez atteint la limite de documents. Contactez l’équipe Connex.",
            );
          await mkdir(directory, { recursive: true, mode: 0o700 });
          for (const file of prepared) {
            const destination = path.join(/* turbopackIgnore: true */ directory, file.id);
            await writeFile(destination, file.buffer, { flag: "wx", mode: 0o600 });
            written.push(destination);
            await tx.mentorDocument.create({
              data: {
                ...file.metadata,
                mentorUserId: user.id,
                scanStatus: "PENDING",
                reviewStatus: "PENDING",
              },
            });
          }
          if (!additionalDocuments)
            await tx.mentorProfile.update({
              where: { userId },
              data: {
                verificationStatus: "PENDING",
                submittedAt: new Date(),
                charterAcceptedAt: profile.charterAcceptedAt ?? new Date(),
                professionalTitle: professionalTitle || profile.professionalTitle,
                biography: biography || profile.biography,
              },
            });
        });
        committed = true;
      } finally {
        if (!committed) await Promise.all(written.map((destination) => unlink(destination)));
      }
    },
  };
}
