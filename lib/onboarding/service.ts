import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { AuthError } from "@/lib/auth/service";
import {
  approvedCertificationFilter,
  isCertificationTestMode,
  MAX_CERTIFICATION_BYTES,
} from "./policy";

export function createOnboardingService(
  db: PrismaClient = getDb(),
  uploadDirectory = path.join(process.cwd(), "uploads", "private", "certifications"),
) {
  return {
    async getProfile(userId: string) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          accountStatus: true,
          roles: { select: { role: true } },
          mentorProfile: {
            select: {
              verificationStatus: true,
              charterAcceptedAt: true,
              professionalTitle: true,
              biography: true,
              documents: {
                where: { withdrawnAt: null },
                orderBy: { uploadedAt: "desc" },
                select: {
                  id: true,
                  originalFilename: true,
                  documentType: true,
                  scanStatus: true,
                  reviewStatus: true,
                },
              },
            },
          },
          founderProfile: {
            select: {
              certificationEvidences: {
                where: { withdrawnAt: null },
                orderBy: { submittedAt: "desc" },
                take: 1,
                select: { verificationStatus: true },
              },
              project: {
                select: { currentRevision: { select: { title: true, reviewStatus: true } } },
              },
            },
          },
        },
      });
      if (!user || ["SUSPENDED", "CLOSED"].includes(user.accountStatus)) return null;
      const isFounder = user.roles.some(({ role }) => role === "FOUNDER");
      const certificate = isFounder
        ? await db.certificationEvidence.findFirst({
            where: { founderUserId: user.id, ...approvedCertificationFilter() },
            select: { id: true },
          })
        : null;
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map(({ role }) => role),
        isFounder,
        isMentor: user.roles.some(({ role }) => role === "MENTOR"),
        mentorStatus: user.mentorProfile?.verificationStatus ?? "DRAFT",
        isMentorApproved:
          user.mentorProfile?.verificationStatus === "APPROVED" &&
          Boolean(user.mentorProfile.charterAcceptedAt) &&
          user.mentorProfile.documents.some(
            (document) => document.scanStatus === "CLEAN" && document.reviewStatus === "APPROVED",
          ),
        mentorDocuments: user.mentorProfile?.documents ?? [],
        mentorProfessionalTitle: user.mentorProfile?.professionalTitle ?? null,
        mentorBiography: user.mentorProfile?.biography ?? null,
        isCertified: Boolean(certificate),
        certificationStatus: certificate
          ? "APPROVED"
          : (user.founderProfile?.certificationEvidences[0]?.verificationStatus ?? "MISSING"),
        project: user.founderProfile?.project?.currentRevision ?? null,
      };
    },

    async uploadCertification(userId: string, file: File) {
      if (!(file instanceof File) || !file.name || file.size === 0)
        throw new AuthError("Choisissez un document à déposer.");
      if (file.size > MAX_CERTIFICATION_BYTES)
        throw new AuthError("Le document doit faire moins de 5 Mo.");
      const localTest = isCertificationTestMode();
      const content = Buffer.from(await file.arrayBuffer());
      // The original name is metadata only; never use it to construct a filesystem path.
      const originalFilename = file.name
        .split(/[\\/]/)
        .pop()!
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .trim()
        .slice(0, 255);
      if (!originalFilename) throw new AuthError("Le nom du document est invalide.");
      const storageId = randomUUID();
      const privateStorageKey = `certifications/${storageId}`;
      // Runtime uploads are not build inputs and must not be traced into the server bundle.
      const destination = path.join(/* turbopackIgnore: true */ uploadDirectory, storageId);
      let written = false;
      let retained = false;
      try {
        const result = await db.$transaction(async (tx) => {
          // Serialize uploads per account and recheck authorization inside the write transaction.
          await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
          const user = await tx.user.findUnique({
            where: { id: userId },
            include: { roles: true, founderProfile: true },
          });
          if (
            !user ||
            ["SUSPENDED", "CLOSED"].includes(user.accountStatus) ||
            !user.founderProfile ||
            !user.roles.some(({ role }) => role === "FOUNDER")
          ) {
            throw new AuthError("Ce dépôt est réservé aux porteurs de projet connectés.");
          }
          if (
            await tx.certificationEvidence.findFirst({
              where: { founderUserId: user.id, ...approvedCertificationFilter() },
            })
          )
            return { certified: true };
          if (
            (await tx.certificationEvidence.count({
              where: {
                founderUserId: user.id,
                verificationStatus: { in: ["PENDING", "IN_REVIEW"] },
                withdrawnAt: null,
              },
            })) >= 3
          ) {
            throw new AuthError(
              "Vos documents ont déjà été déposés. Leur vérification est en cours.",
            );
          }
          await mkdir(uploadDirectory, { recursive: true, mode: 0o700 });
          await writeFile(destination, content, { flag: "wx", mode: 0o600 });
          written = true;
          await tx.certificationEvidence.create({
            data: {
              founderUserId: user.id,
              privateStorageKey,
              originalFilename,
              mimeType: file.type.slice(0, 150) || "application/octet-stream",
              sizeBytes: BigInt(content.length),
              checksum: createHash("sha256").update(content).digest("hex"),
              holderName: [user.firstName, user.lastName].filter(Boolean).join(" ").slice(0, 200),
              isTest: localTest,
              // Simulated local scan/review only. Normal uploads await the trusted review pipeline.
              scanStatus: localTest ? "CLEAN" : "PENDING",
              verificationStatus: localTest ? "APPROVED" : "PENDING",
            },
          });
          return { certified: localTest };
        });
        retained = written;
        return result;
      } finally {
        if (written && !retained) await unlink(destination);
      }
    },
  };
}
