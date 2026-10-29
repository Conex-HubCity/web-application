import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { isMentorPreviewEnabled } from "@/lib/release";
import { approvedCertificationFilter } from "@/lib/onboarding/policy";
import { DomainError } from "./policies";
import { requireFounderAccount } from "./founder-access";
import { parseProjectPresentation, readPresentationLinks } from "@/lib/projects/presentation";
export async function getFounderDashboard(userId: string, db: PrismaClient = getDb()) {
  const user = await requireFounderAccount(userId, db);
  const [project, certificate] = await Promise.all([
    db.project.findUnique({
      where: { founderUserId: user.id },
      select: {
        id: true,
        currentRevision: {
          select: {
            title: true,
            summary: true,
            sector: true,
            stage: true,
            supportNeeds: true,
            reviewStatus: true,
            presentedAt: true,
            archivedAt: true,
            pitchUrl: true,
            socialLinks: true,
            customLinks: true,
            updatedAt: true,
            brandingImage: { select: { id: true, fullWidth: true, fullHeight: true } },
          },
        },
      },
    }),
    db.certificationEvidence.findFirst({
      where: { founderUserId: user.id, ...approvedCertificationFilter() },
      select: { id: true },
    }),
  ]);
  const revision = project?.currentRevision;
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    certified: Boolean(certificate),
    certificationAvailable: !isMentorPreviewEnabled(),
    project:
      project && revision
        ? {
            id: project.id,
            title: revision.title,
            summary: revision.summary ?? "",
            sector: revision.sector ?? "",
            stage: revision.stage ?? "",
            supportNeeds: revision.supportNeeds,
            visible:
              Boolean(revision.presentedAt) &&
              !revision.archivedAt &&
              !["REJECTED", "REVOKED"].includes(revision.reviewStatus),
            editable:
              !revision.archivedAt &&
              ["DRAFT", "CHANGES_REQUESTED"].includes(revision.reviewStatus),
            pitchUrl: revision.pitchUrl ?? "",
            socialLinks: readPresentationLinks(revision.socialLinks),
            customLinks: readPresentationLinks(revision.customLinks),
            updatedAt: revision.updatedAt.toISOString(),
            presentedAt: revision.presentedAt?.toISOString() ?? null,
            image: revision.brandingImage
              ? {
                  id: revision.brandingImage.id,
                  width: revision.brandingImage.fullWidth,
                  height: revision.brandingImage.fullHeight,
                  fullUrl: `/api/project-images/${revision.brandingImage.id}/full`,
                  thumbnailUrl: `/api/project-images/${revision.brandingImage.id}/thumbnail`,
                }
              : null,
          }
        : null,
  };
}
export type FounderDashboardData = Awaited<ReturnType<typeof getFounderDashboard>>;
export async function saveFounderProject(
  userId: string,
  form: FormData,
  db: PrismaClient = getDb(),
) {
  const data = parseProjectPresentation(form);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`;
    await requireFounderAccount(userId, tx);
    if (data.brandingImageId) {
      const image = await tx.projectImage.findFirst({
        where: { id: data.brandingImageId, ownerUserId: userId },
        select: { id: true },
      });
      if (!image) throw new DomainError("IMAGE_UNAVAILABLE", "Cette image ne vous appartient pas.");
    }
    const project = await tx.project.findUnique({
      where: { founderUserId: userId },
      include: { currentRevision: true },
    });
    if (project) {
      await tx.$queryRaw`SELECT id FROM projects WHERE id=${project.id}::uuid FOR UPDATE`;
      const current = await tx.project.findUniqueOrThrow({
        where: { id: project.id },
        include: { currentRevision: true },
      });
      if (
        !current.currentRevision ||
        current.currentRevision.archivedAt ||
        !["DRAFT", "CHANGES_REQUESTED"].includes(current.currentRevision.reviewStatus)
      )
        throw new DomainError(
          "PROJECT_LOCKED",
          "Cette version ne peut plus être modifiée directement.",
        );
      await tx.projectRevision.update({
        where: { id: current.currentRevision.id },
        data: { ...data, presentedAt: current.currentRevision.presentedAt ?? new Date() },
      });
      return;
    }
    const created = await tx.project.create({
      data: {
        founderUserId: userId,
        revisions: { create: { ...data, revisionNumber: 1, presentedAt: new Date() } },
      },
      include: { revisions: { select: { id: true } } },
    });
    await tx.project.update({
      where: { id: created.id },
      data: { currentRevisionId: created.revisions[0].id },
    });
  });
}
