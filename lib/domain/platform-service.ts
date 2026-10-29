import "server-only";
import { approvedCertificationFilter } from "@/lib/onboarding/policy";
import {
  Prisma,
  type PrismaClient,
  type MentorVisibility,
  type MentorDocumentType,
  type ValidationOutcome,
  type FollowUpType,
} from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import {
  DomainError,
  assertFileMetadata,
  assertProjectReplacement,
  requiredText,
  requireCondition,
} from "./policies";

type Tx = Prisma.TransactionClient;
type ValidationTarget =
  | { kind: "CERTIFICATION"; id: string }
  | { kind: "MENTOR"; id: string; evidenceIds?: string[] }
  | { kind: "MENTOR_DOCUMENT"; id: string }
  | { kind: "PROJECT"; id: string };
type FileMetadata = {
  privateStorageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: bigint;
  checksum: string;
};
type ProjectDraft = {
  title: string;
  summary?: string;
  sector?: string;
  stage?: string;
  supportNeeds?: string[];
};

function projectData(input: ProjectDraft) {
  function text(value: unknown) {
    if (value === undefined) return undefined;
    requireCondition(
      typeof value === "string",
      "INVALID_INPUT",
      "Les champs du projet doivent être du texte.",
    );
    return value.trim() || null;
  }
  if (input.supportNeeds !== undefined)
    requireCondition(
      Array.isArray(input.supportNeeds) &&
        input.supportNeeds.every((value) => typeof value === "string" && value.trim()),
      "INVALID_INPUT",
      "Les besoins doivent être une liste de textes.",
    );
  const title = requiredText(input.title, "Le titre");
  requireCondition(
    title.length <= 200,
    "INVALID_INPUT",
    "Le titre ne doit pas dépasser 200 caractères.",
  );
  requireCondition(
    (input.summary?.length ?? 0) <= 6000 &&
      (input.sector?.length ?? 0) <= 150 &&
      (input.stage?.length ?? 0) <= 100,
    "INVALID_INPUT",
    "La présentation du projet est trop longue.",
  );
  requireCondition(
    (input.supportNeeds?.length ?? 0) <= 10 &&
      (input.supportNeeds ?? []).every((value) => value.length <= 200),
    "INVALID_INPUT",
    "Choisissez jusqu’à dix besoins d’accompagnement.",
  );
  return {
    title,
    summary: text(input.summary),
    sector: text(input.sector),
    stage: text(input.stage),
    supportNeeds: input.supportNeeds?.map((value) => value.trim()),
  };
}

// actorId must come from a verified server session, never a request-body identity.
// Public Server Actions authenticate before calling this service.
export function createPlatformService(db: PrismaClient = getDb()) {
  async function transaction<T>(operation: (tx: Tx) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await db.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 15000,
        });
      } catch (error) {
        if (
          attempt < 2 &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034"
        )
          continue;
        throw error;
      }
    }
  }

  async function actor(tx: Tx, id: string, role?: "ADMIN" | "MENTOR" | "FOUNDER") {
    const user = await tx.user.findUnique({ where: { id }, include: { roles: true } });
    requireCondition(
      user && user.accountStatus === "ACTIVE" && (user.emailVerifiedAt || user.phoneVerifiedAt),
      "ACCOUNT_UNAVAILABLE",
      "Le compte doit être actif et son contact vérifié.",
    );
    if (role)
      requireCondition(
        user.roles.some((entry) => entry.role === role),
        "FORBIDDEN",
        "Cette action n’est pas autorisée.",
      );
    return user;
  }

  async function lockProject(tx: Tx, projectId: string) {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM projects WHERE id = ${projectId}::uuid FOR UPDATE`;
    requireCondition(rows.length === 1, "PROJECT_NOT_FOUND", "Projet introuvable.");
    return tx.project.findUniqueOrThrow({
      where: { id: projectId },
      include: { currentRevision: true },
    });
  }

  async function certifiedFounder(tx: Tx, userId: string) {
    await actor(tx, userId, "FOUNDER");
    const profile = await tx.founderProfile.findUnique({ where: { userId } });
    requireCondition(
      profile?.adultConfirmedAt,
      "MAJORITY_REQUIRED",
      "La majorité doit être confirmée.",
    );
    const certificate = await tx.certificationEvidence.findFirst({
      where: {
        founderUserId: userId,
        ...approvedCertificationFilter(),
      },
    });
    requireCondition(
      certificate,
      "CERTIFICATION_REQUIRED",
      "Un certificat Rouge validé est nécessaire.",
    );
  }

  async function activeMentor(tx: Tx, userId: string, now: Date) {
    await actor(tx, userId, "MENTOR");
    const profile = await tx.mentorProfile.findUnique({ where: { userId } });
    requireCondition(
      profile?.verificationStatus === "APPROVED" && profile.charterAcceptedAt,
      "MENTOR_NOT_VERIFIED",
      "La candidature mentor doit être validée.",
    );
    const membership = await tx.membership.findFirst({
      where: {
        mentorUserId: userId,
        status: "ACTIVE",
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
    });
    requireCondition(membership, "MEMBERSHIP_REQUIRED", "Une adhésion active est nécessaire.");
  }

  async function publishedRevision(tx: Tx, revisionId: string) {
    const revision = await tx.projectRevision.findUniqueOrThrow({
      where: { id: revisionId },
      include: { project: true },
    });
    requireCondition(
      revision.project.currentRevisionId === revision.id &&
        revision.reviewStatus === "APPROVED" &&
        revision.publishedAt &&
        !revision.archivedAt &&
        revision.pitchScanStatus === "CLEAN",
      "PROJECT_UNAVAILABLE",
      "Ce projet n’est pas disponible.",
    );
    await certifiedFounder(tx, revision.project.founderUserId);
    return revision;
  }

  async function lockedRequest(tx: Tx, requestId: string) {
    const request = await tx.mentorshipRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { projectRevision: true },
    });
    const project = await lockProject(tx, request.projectRevision.projectId);
    return {
      request: await tx.mentorshipRequest.findUniqueOrThrow({ where: { id: requestId } }),
      project,
    };
  }

  return {
    // This is the safe role-aware response for the future login/session layer.
    async getAccountContext(userId: string) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          accountStatus: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
          roles: { select: { role: true } },
          mentorProfile: { select: { verificationStatus: true } },
          founderProfile: { select: { userId: true } },
        },
      });
      requireCondition(user, "ACCOUNT_UNAVAILABLE", "Compte introuvable.");
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        accountStatus: user.accountStatus,
        contactVerified: Boolean(user.emailVerifiedAt || user.phoneVerifiedAt),
        roles: user.roles.map(({ role }) => role),
        hasFounderProfile: Boolean(user.founderProfile),
        mentorVerificationStatus: user.mentorProfile?.verificationStatus ?? null,
      };
    },

    async setMentorVisibility(actorId: string, visibility: MentorVisibility) {
      requireCondition(
        visibility === "PRIVATE" || visibility === "PLATFORM",
        "INVALID_INPUT",
        "Visibilité invalide.",
      );
      return transaction(async (tx) => {
        await actor(tx, actorId, "MENTOR");
        return tx.mentorProfile.update({
          where: { userId: actorId },
          data: {
            visibilityPreference: visibility,
            visibilityRequestedAt: visibility === "PLATFORM" ? new Date() : null,
          },
        });
      });
    },

    async authorizeMentorDocument(actorId: string, documentId: string) {
      return transaction(async (tx) => {
        const user = await actor(tx, actorId);
        const document = await tx.mentorDocument.findUniqueOrThrow({ where: { id: documentId } });
        requireCondition(
          document.mentorUserId === actorId || user.roles.some(({ role }) => role === "ADMIN"),
          "FORBIDDEN",
          "Ce document est privé.",
        );
        requireCondition(
          document.scanStatus === "CLEAN" && !document.withdrawnAt,
          "UNSAFE_DOCUMENT",
          "La pièce n’est pas disponible.",
        );
        return { storageKey: document.privateStorageKey };
      });
    },

    async authorizeCertificationDocument(actorId: string, evidenceId: string) {
      return transaction(async (tx) => {
        const user = await actor(tx, actorId);
        const evidence = await tx.certificationEvidence.findUniqueOrThrow({
          where: { id: evidenceId },
        });
        requireCondition(
          evidence.founderUserId === actorId || user.roles.some(({ role }) => role === "ADMIN"),
          "FORBIDDEN",
          "Ce certificat est privé.",
        );
        requireCondition(
          evidence.scanStatus === "CLEAN" && !evidence.withdrawnAt,
          "UNSAFE_DOCUMENT",
          "La preuve n’est pas disponible.",
        );
        return { storageKey: evidence.privateStorageKey };
      });
    },

    async listVisibleMentors(actorId: string) {
      return transaction(async (tx) => {
        await certifiedFounder(tx, actorId);
        const now = new Date();
        return tx.mentorProfile.findMany({
          where: {
            userId: { not: actorId },
            visibilityPreference: "PLATFORM",
            verificationStatus: "APPROVED",
            charterAcceptedAt: { not: null },
            user: {
              accountStatus: "ACTIVE",
              roles: { some: { role: "MENTOR" } },
              OR: [{ emailVerifiedAt: { not: null } }, { phoneVerifiedAt: { not: null } }],
            },
            memberships: {
              some: { status: "ACTIVE", startsAt: { lte: now }, endsAt: { gt: now } },
            },
          },
          select: {
            userId: true,
            professionalTitle: true,
            biography: true,
            countryCode: true,
            city: true,
            expertise: true,
            languages: true,
            user: { select: { firstName: true, lastName: true } },
          },
        });
      });
    },

    async registerMentorDocument(
      actorId: string,
      input: FileMetadata & { documentType: MentorDocumentType; supersedesDocumentId?: string },
    ) {
      assertFileMetadata(input);
      return transaction(async (tx) => {
        await actor(tx, actorId, "MENTOR");
        // Storage metadata must originate from the server upload pipeline.
        return tx.mentorDocument.create({
          data: {
            mentorUserId: actorId,
            documentType: input.documentType,
            originalFilename: input.originalFilename,
            privateStorageKey: input.privateStorageKey,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
            checksum: input.checksum,
            supersedesDocumentId: input.supersedesDocumentId,
          },
        });
      });
    },

    async withdrawMentorDocument(actorId: string, documentId: string) {
      return transaction(async (tx) => {
        await actor(tx, actorId, "MENTOR");
        const document = await tx.mentorDocument.findUniqueOrThrow({ where: { id: documentId } });
        requireCondition(
          document.mentorUserId === actorId,
          "FORBIDDEN",
          "Cette pièce ne vous appartient pas.",
        );
        const latest = await tx.validationDecision.findFirst({
          where: { mentorUserId: actorId },
          orderBy: { decidedAt: "desc" },
          include: { mentorEvidence: true },
        });
        if (
          latest?.outcome === "APPROVED" &&
          latest.mentorEvidence.some((entry) => entry.mentorDocumentId === documentId)
        ) {
          await tx.mentorProfile.update({
            where: { userId: actorId },
            data: { verificationStatus: "PENDING" },
          });
        }
        return tx.mentorDocument.update({
          where: { id: documentId },
          data: { withdrawnAt: document.withdrawnAt ?? new Date(), reviewStatus: "REVOKED" },
        });
      });
    },

    async createProject(actorId: string, input: ProjectDraft) {
      const draft = projectData(input);
      return transaction(async (tx) => {
        await actor(tx, actorId, "FOUNDER");
        const founder = await tx.founderProfile.findUnique({ where: { userId: actorId } });
        requireCondition(
          founder?.adultConfirmedAt,
          "MAJORITY_REQUIRED",
          "La majorité doit être confirmée.",
        );
        return tx.project
          .create({
            data: {
              founderUserId: actorId,
              revisions: { create: { ...draft, revisionNumber: 1 } },
            },
            include: { revisions: true },
          })
          .then(async (project) => {
            return tx.project.update({
              where: { id: project.id },
              data: { currentRevisionId: project.revisions[0].id },
              include: { currentRevision: true },
            });
          });
      });
    },

    async updateProjectDraft(actorId: string, projectId: string, input: ProjectDraft) {
      return transaction(async (tx) => {
        await actor(tx, actorId, "FOUNDER");
        const project = await lockProject(tx, projectId);
        requireCondition(
          project.founderUserId === actorId,
          "FORBIDDEN",
          "Ce projet ne vous appartient pas.",
        );
        requireCondition(
          project.currentRevision &&
            ["DRAFT", "CHANGES_REQUESTED"].includes(project.currentRevision.reviewStatus),
          "PROJECT_LOCKED",
          "Cette version ne peut plus être modifiée directement.",
        );
        return tx.projectRevision.update({
          where: { id: project.currentRevision.id },
          data: projectData(input),
        });
      });
    },

    async submitProject(actorId: string, projectId: string) {
      return transaction(async (tx) => {
        const project = await lockProject(tx, projectId);
        requireCondition(
          project.founderUserId === actorId,
          "FORBIDDEN",
          "Ce projet ne vous appartient pas.",
        );
        await certifiedFounder(tx, actorId);
        const revision = project.currentRevision;
        requireCondition(
          revision && ["DRAFT", "CHANGES_REQUESTED"].includes(revision.reviewStatus),
          "PROJECT_LOCKED",
          "Cette version n’est pas soumissible.",
        );
        requireCondition(
          revision.privatePitchStorageKey && revision.pitchScanStatus === "CLEAN",
          "PITCH_REQUIRED",
          "Un pitch contrôlé est nécessaire.",
        );
        return tx.projectRevision.update({
          where: { id: revision.id },
          data: { reviewStatus: "SUBMITTED", submittedAt: revision.submittedAt ?? new Date() },
        });
      });
    },

    async recordValidation(
      actorId: string,
      target: ValidationTarget,
      outcome: ValidationOutcome,
      reason?: string,
    ) {
      requireCondition(
        ["APPROVED", "CHANGES_REQUESTED", "REJECTED", "REVOKED"].includes(outcome),
        "INVALID_INPUT",
        "Décision invalide.",
      );
      if (outcome !== "APPROVED") requiredText(reason ?? "", "Le motif");
      return transaction(async (tx) => {
        await actor(tx, actorId, "ADMIN");
        const status = outcome === "CHANGES_REQUESTED" ? "REJECTED" : outcome;
        let data: Prisma.ValidationDecisionUncheckedCreateInput;
        const common = { reviewerUserId: actorId, outcome, reason: reason?.trim() || null };
        if (target.kind === "PROJECT") {
          const revision = await tx.projectRevision.findUniqueOrThrow({ where: { id: target.id } });
          const project = await lockProject(tx, revision.projectId);
          requireCondition(
            project.currentRevisionId === revision.id && !revision.archivedAt,
            "PROJECT_UNAVAILABLE",
            "Cette version n’est plus courante.",
          );
          requireCondition(
            outcome === "REVOKED"
              ? revision.reviewStatus === "APPROVED"
              : ["SUBMITTED", "IN_REVIEW"].includes(revision.reviewStatus),
            "INVALID_TRANSITION",
            "La décision ne correspond pas à l’état du projet.",
          );
          if (outcome === "APPROVED") await certifiedFounder(tx, project.founderUserId);
          await tx.projectRevision.update({
            where: { id: target.id },
            data: { reviewStatus: outcome },
          });
          data = { ...common, projectRevisionId: target.id };
        } else if (target.kind === "CERTIFICATION") {
          const evidence = await tx.certificationEvidence.findUniqueOrThrow({
            where: { id: target.id },
          });
          const project = await tx.project.findUnique({
            where: { founderUserId: evidence.founderUserId },
          });
          if (project) await lockProject(tx, project.id);
          requireCondition(
            outcome === "REVOKED"
              ? evidence.verificationStatus === "APPROVED"
              : ["PENDING", "IN_REVIEW"].includes(evidence.verificationStatus),
            "INVALID_TRANSITION",
            "Cette preuve n’est pas dans un état compatible.",
          );
          if (outcome === "APPROVED")
            requireCondition(
              evidence.scanStatus === "CLEAN" && !evidence.withdrawnAt,
              "UNSAFE_DOCUMENT",
              "La preuve doit être contrôlée et disponible.",
            );
          await tx.certificationEvidence.update({
            where: { id: target.id },
            data: { verificationStatus: status },
          });
          data = { ...common, certificationEvidenceId: target.id };
        } else if (target.kind === "MENTOR_DOCUMENT") {
          const document = await tx.mentorDocument.findUniqueOrThrow({ where: { id: target.id } });
          requireCondition(
            outcome === "REVOKED"
              ? document.reviewStatus === "APPROVED"
              : ["PENDING", "IN_REVIEW"].includes(document.reviewStatus),
            "INVALID_TRANSITION",
            "La pièce n’est pas dans un état compatible.",
          );
          if (outcome === "APPROVED")
            requireCondition(
              document.scanStatus === "CLEAN" && !document.withdrawnAt,
              "UNSAFE_DOCUMENT",
              "La pièce doit être contrôlée et disponible.",
            );
          await tx.mentorDocument.update({
            where: { id: target.id },
            data: { reviewStatus: status },
          });
          if (outcome === "REVOKED") {
            const latest = await tx.validationDecision.findFirst({
              where: { mentorUserId: document.mentorUserId },
              orderBy: { decidedAt: "desc" },
              include: { mentorEvidence: true },
            });
            if (
              latest?.outcome === "APPROVED" &&
              latest.mentorEvidence.some((entry) => entry.mentorDocumentId === target.id)
            )
              await tx.mentorProfile.update({
                where: { userId: document.mentorUserId },
                data: { verificationStatus: "PENDING" },
              });
          }
          data = { ...common, mentorDocumentId: target.id };
        } else {
          const profile = await tx.mentorProfile.findUniqueOrThrow({
            where: { userId: target.id },
          });
          requireCondition(
            outcome === "REVOKED"
              ? profile.verificationStatus === "APPROVED"
              : ["PENDING", "IN_REVIEW"].includes(profile.verificationStatus),
            "INVALID_TRANSITION",
            "La candidature n’est pas dans un état compatible.",
          );
          if (outcome === "APPROVED") {
            const ids = [...new Set(target.evidenceIds ?? [])];
            requireCondition(
              ids.length && profile.charterAcceptedAt,
              "EVIDENCE_REQUIRED",
              "Les justificatifs et la charte sont nécessaires.",
            );
            const count = await tx.mentorDocument.count({
              where: {
                id: { in: ids },
                mentorUserId: target.id,
                reviewStatus: "APPROVED",
                scanStatus: "CLEAN",
                withdrawnAt: null,
              },
            });
            requireCondition(
              count === ids.length,
              "INVALID_EVIDENCE",
              "Les justificatifs doivent être acceptés et appartenir au mentor.",
            );
          }
          await tx.mentorProfile.update({
            where: { userId: target.id },
            data: { verificationStatus: status },
          });
          data = { ...common, mentorUserId: target.id };
        }
        const decision = await tx.validationDecision.create({ data });
        if (target.kind === "MENTOR" && outcome === "APPROVED")
          await tx.mentorValidationDocument.createMany({
            data: [...new Set(target.evidenceIds)].map((id) => ({
              decisionId: decision.id,
              mentorDocumentId: id,
              mentorUserId: target.id,
            })),
          });
        return decision;
      });
    },

    async publishProject(actorId: string, projectId: string) {
      return transaction(async (tx) => {
        await actor(tx, actorId, "ADMIN");
        const project = await lockProject(tx, projectId);
        await certifiedFounder(tx, project.founderUserId);
        requireCondition(
          project.currentRevision?.reviewStatus === "APPROVED" &&
            !project.currentRevision.archivedAt,
          "PROJECT_NOT_APPROVED",
          "Le pitch doit être validé séparément.",
        );
        return tx.projectRevision.update({
          where: { id: project.currentRevision.id },
          data: { publishedAt: project.currentRevision.publishedAt ?? new Date() },
        });
      });
    },

    async listAvailableProjects(actorId: string) {
      return transaction(async (tx) => {
        await activeMentor(tx, actorId, new Date());
        // Return presentation data only. File access has a separate authorization path.
        return tx.project.findMany({
          where: {
            founderUserId: { not: actorId },
            currentRevision: {
              reviewStatus: "APPROVED",
              publishedAt: { not: null },
              archivedAt: null,
            },
            founder: {
              adultConfirmedAt: { not: null },
              user: {
                accountStatus: "ACTIVE",
                OR: [{ emailVerifiedAt: { not: null } }, { phoneVerifiedAt: { not: null } }],
                roles: { some: { role: "FOUNDER" } },
              },
              certificationEvidences: {
                some: approvedCertificationFilter(),
              },
            },
          },
          select: {
            id: true,
            currentRevision: {
              select: {
                id: true,
                title: true,
                summary: true,
                sector: true,
                stage: true,
                supportNeeds: true,
              },
            },
          },
        });
      });
    },

    async authorizeProjectDocument(actorId: string, revisionId: string) {
      return transaction(async (tx) => {
        const user = await actor(tx, actorId);
        const revision = await tx.projectRevision.findUniqueOrThrow({
          where: { id: revisionId },
          include: { project: true },
        });
        const privileged =
          user.roles.some(({ role }) => role === "ADMIN") ||
          revision.project.founderUserId === actorId;
        if (!privileged) {
          await activeMentor(tx, actorId, new Date());
          await publishedRevision(tx, revisionId);
        }
        requireCondition(
          revision.pitchScanStatus === "CLEAN" && revision.privatePitchStorageKey,
          "UNSAFE_DOCUMENT",
          "Ce document n’est pas disponible.",
        );
        // Server use only: never send storage keys as a public catalog response.
        return { storageKey: revision.privatePitchStorageKey };
      });
    },

    async requestMentorship(actorId: string, revisionId: string, message?: string) {
      return transaction(async (tx) => {
        const snapshot = await tx.projectRevision.findUniqueOrThrow({ where: { id: revisionId } });
        await lockProject(tx, snapshot.projectId);
        await activeMentor(tx, actorId, new Date());
        const revision = await publishedRevision(tx, revisionId);
        requireCondition(
          revision.project.founderUserId !== actorId,
          "SELF_MENTORSHIP",
          "Vous ne pouvez pas accompagner votre propre projet.",
        );
        const duplicate = await tx.mentorshipRequest.findFirst({
          where: {
            mentorUserId: actorId,
            projectRevisionId: revisionId,
            status: {
              in: ["PENDING_REVIEW", "INVITED", "INTRO_SCHEDULED", "AWAITING_CONSENT", "ACCEPTED"],
            },
          },
        });
        requireCondition(!duplicate, "REQUEST_EXISTS", "Une demande existe déjà pour ce projet.");
        return tx.mentorshipRequest.create({
          data: {
            mentorUserId: actorId,
            projectRevisionId: revisionId,
            message: message?.trim() || null,
          },
        });
      });
    },

    async approveMentorshipRequest(actorId: string, requestId: string) {
      return transaction(async (tx) => {
        await actor(tx, actorId, "ADMIN");
        const { request } = await lockedRequest(tx, requestId);
        requireCondition(
          request.status === "PENDING_REVIEW",
          "INVALID_TRANSITION",
          "La demande a déjà été examinée.",
        );
        await activeMentor(tx, request.mentorUserId, new Date());
        await publishedRevision(tx, request.projectRevisionId);
        return tx.mentorshipRequest.update({
          where: { id: requestId },
          data: { status: "INVITED", reviewedByUserId: actorId, reviewedAt: new Date() },
        });
      });
    },

    async recordIntroMeeting(actorId: string, requestId: string, heldAt: Date) {
      requireCondition(
        Number.isFinite(heldAt.getTime()) && heldAt <= new Date(),
        "INVALID_DATE",
        "La rencontre doit avoir eu lieu.",
      );
      return transaction(async (tx) => {
        await actor(tx, actorId, "ADMIN");
        const { request } = await lockedRequest(tx, requestId);
        requireCondition(
          ["INVITED", "INTRO_SCHEDULED"].includes(request.status) &&
            heldAt >= request.createdAt &&
            request.reviewedAt &&
            heldAt >= request.reviewedAt,
          "INVALID_TRANSITION",
          "Cette rencontre ne correspond pas à la demande.",
        );
        await publishedRevision(tx, request.projectRevisionId);
        return tx.mentorshipRequest.update({
          where: { id: requestId },
          data: { introMeetingHeldAt: heldAt, status: "AWAITING_CONSENT" },
        });
      });
    },

    async consentToMentorship(actorId: string, requestId: string) {
      return transaction(async (tx) => {
        await actor(tx, actorId);
        const { request, project } = await lockedRequest(tx, requestId);
        requireCondition(
          request.status === "AWAITING_CONSENT" && request.introMeetingHeldAt,
          "INVALID_TRANSITION",
          "La rencontre doit précéder les consentements.",
        );
        requireCondition(
          actorId === request.mentorUserId || actorId === project.founderUserId,
          "FORBIDDEN",
          "Seuls les participants peuvent consentir.",
        );
        await publishedRevision(tx, request.projectRevisionId);
        await activeMentor(tx, request.mentorUserId, new Date());
        const now = new Date();
        const mentorConsentedAt =
          request.mentorConsentedAt ?? (actorId === request.mentorUserId ? now : null);
        const founderConsentedAt =
          request.founderConsentedAt ?? (actorId === project.founderUserId ? now : null);
        return tx.mentorshipRequest.update({
          where: { id: requestId },
          data: {
            mentorConsentedAt,
            founderConsentedAt,
            status: mentorConsentedAt && founderConsentedAt ? "ACCEPTED" : "AWAITING_CONSENT",
          },
        });
      });
    },

    async declineMentorship(actorId: string, requestId: string) {
      return transaction(async (tx) => {
        await actor(tx, actorId);
        const { request, project } = await lockedRequest(tx, requestId);
        requireCondition(
          actorId === request.mentorUserId || actorId === project.founderUserId,
          "FORBIDDEN",
          "Seuls les participants peuvent refuser.",
        );
        requireCondition(
          ["INVITED", "INTRO_SCHEDULED", "AWAITING_CONSENT", "ACCEPTED"].includes(request.status),
          "INVALID_TRANSITION",
          "Cette demande ne peut plus être refusée.",
        );
        requireCondition(
          !(await tx.mentorship.findUnique({ where: { requestId } })),
          "MENTORSHIP_OPEN",
          "Un compagnonnage actif nécessite une clôture.",
        );
        return tx.mentorshipRequest.update({
          where: { id: requestId },
          data: { status: "DECLINED" },
        });
      });
    },

    async activateMentorship(actorId: string, requestId: string) {
      return transaction(async (tx) => {
        await actor(tx, actorId, "ADMIN");
        const { request } = await lockedRequest(tx, requestId);
        requireCondition(
          request.status === "ACCEPTED" &&
            request.reviewedByUserId &&
            request.reviewedAt &&
            request.introMeetingHeldAt &&
            request.mentorConsentedAt &&
            request.founderConsentedAt,
          "CONSENT_REQUIRED",
          "Validation CNX, rencontre et consentements sont nécessaires.",
        );
        await activeMentor(tx, request.mentorUserId, new Date());
        await publishedRevision(tx, request.projectRevisionId);
        return tx.mentorship.create({ data: { requestId } });
      });
    },

    async recordFollowUp(
      actorId: string,
      mentorshipId: string,
      input: { type: FollowUpType; summary: string; occurredAt: Date; reportPeriod?: Date },
    ) {
      requireCondition(
        Number.isFinite(input.occurredAt.getTime()) && input.occurredAt <= new Date(),
        "INVALID_DATE",
        "La date de suivi est invalide.",
      );
      return transaction(async (tx) => {
        await actor(tx, actorId);
        const mentorship = await tx.mentorship.findUniqueOrThrow({
          where: { id: mentorshipId },
          include: { request: { include: { projectRevision: true } } },
        });
        const project = await lockProject(tx, mentorship.request.projectRevision.projectId);
        requireCondition(
          actorId === mentorship.request.mentorUserId || actorId === project.founderUserId,
          "FORBIDDEN",
          "Vous ne participez pas à ce compagnonnage.",
        );
        requireCondition(
          ["ACTIVE", "PAUSED"].includes(mentorship.status) &&
            input.occurredAt >= mentorship.activatedAt,
          "MENTORSHIP_CLOSED",
          "Ce compagnonnage n’accepte pas ce suivi.",
        );
        return tx.followUp.create({
          data: {
            type: input.type,
            occurredAt: input.occurredAt,
            reportPeriod: input.reportPeriod,
            summary: requiredText(input.summary, "Le compte rendu"),
            mentorshipId,
            authorUserId: actorId,
            status: "SUBMITTED",
          },
        });
      });
    },

    async approveFollowUp(actorId: string, followUpId: string) {
      return transaction(async (tx) => {
        await actor(tx, actorId, "ADMIN");
        const followUp = await tx.followUp.findUniqueOrThrow({
          where: { id: followUpId },
          include: { mentorship: { include: { request: { include: { projectRevision: true } } } } },
        });
        await lockProject(tx, followUp.mentorship.request.projectRevision.projectId);
        requireCondition(
          followUp.status === "SUBMITTED" &&
            followUp.occurredAt &&
            followUp.occurredAt <= new Date(),
          "INVALID_TRANSITION",
          "Le suivi doit être soumis et réalisé.",
        );
        return tx.followUp.update({
          where: { id: followUpId },
          data: { status: "APPROVED", reviewedByUserId: actorId, reviewedAt: new Date() },
        });
      });
    },

    async closeMentorship(actorId: string, mentorshipId: string, reason: string) {
      return transaction(async (tx) => {
        await actor(tx, actorId, "ADMIN");
        const mentorship = await tx.mentorship.findUniqueOrThrow({
          where: { id: mentorshipId },
          include: { request: { include: { projectRevision: true } } },
        });
        await lockProject(tx, mentorship.request.projectRevision.projectId);
        requireCondition(
          ["ACTIVE", "PAUSED"].includes(mentorship.status),
          "INVALID_TRANSITION",
          "Ce compagnonnage est déjà clôturé.",
        );
        return tx.mentorship.update({
          where: { id: mentorshipId },
          data: {
            status: "COMPLETED",
            endedAt: new Date(),
            closureReason: requiredText(reason, "Le motif"),
          },
        });
      });
    },

    async replaceProject(actorId: string, projectId: string, input: ProjectDraft) {
      return transaction(async (tx) => {
        await actor(tx, actorId, "FOUNDER");
        const project = await lockProject(tx, projectId);
        requireCondition(
          project.founderUserId === actorId,
          "FORBIDDEN",
          "Ce projet ne vous appartient pas.",
        );
        const current = project.currentRevision;
        requireCondition(current, "PROJECT_NOT_FOUND", "Aucune version courante.");
        const open = await tx.mentorship.count({
          where: {
            status: { in: ["ACTIVE", "PAUSED"] },
            request: { projectRevision: { projectId } },
          },
        });
        const followUp = await tx.followUp.findFirst({
          where: {
            status: "APPROVED",
            occurredAt: { not: null },
            mentorship: { request: { projectRevisionId: current.id } },
          },
          orderBy: { occurredAt: "desc" },
        });
        const meeting = await tx.mentorshipRequest.findFirst({
          where: { projectRevisionId: current.id, introMeetingHeldAt: { not: null } },
          orderBy: { introMeetingHeldAt: "desc" },
        });
        const dates = [followUp?.occurredAt, meeting?.introMeetingHeldAt].filter(
          (date): date is Date => Boolean(date),
        );
        const now = new Date();
        assertProjectReplacement({
          hasOpenMentorship: open > 0,
          submittedAt: current.submittedAt,
          lastFollowUpAt: dates.length
            ? new Date(Math.max(...dates.map((date) => date.getTime())))
            : null,
          now,
        });
        const last = await tx.projectRevision.aggregate({
          where: { projectId },
          _max: { revisionNumber: true },
        });
        const revision = await tx.projectRevision.create({
          data: {
            ...projectData(input),
            projectId,
            revisionNumber: (last._max.revisionNumber ?? 0) + 1,
          },
        });
        await tx.projectRevision.update({ where: { id: current.id }, data: { archivedAt: now } });
        await tx.project.update({
          where: { id: projectId },
          data: { currentRevisionId: revision.id },
        });
        return revision;
      });
    },
  };
}

export { DomainError };
