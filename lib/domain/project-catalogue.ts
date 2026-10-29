import "server-only";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { isMentorPreviewEnabled } from "@/lib/release";
import { stripeLiveMode } from "@/lib/payments/config";
import { DomainError } from "./policies";

export type PresentationLink = { label: string; url: string };
export type ProjectPresentation = {
  id: string;
  revisionId: string;
  title: string;
  summary: string | null;
  sector: string | null;
  stage: string | null;
  supportNeeds: string[];
  pitchUrl: string;
  socialLinks: PresentationLink[];
  customLinks: PresentationLink[];
  imageId: string | null;
  fullUrl: string | null;
  thumbnailUrl: string | null;
  image: {
    id: string;
    fullUrl: string;
    thumbnailUrl: string;
    width: number;
    height: number;
  } | null;
  founder: { firstName: string; lastName: string | null };
  presentedAt: string;
  updatedAt: string;
  isOwner: boolean;
};

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const forbidden = () =>
  new DomainError("CATALOGUE_FORBIDDEN", "L’accès aux projets est réservé aux mentors validés.");

/** Presentation access is independent of the legacy recurring Membership model. */
export async function requireProjectCatalogueMentor(
  userId: string,
  db: PrismaClient = getDb(),
): Promise<void> {
  if (!uuid.test(userId)) throw forbidden();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      accountStatus: true,
      emailVerifiedAt: true,
      roles: { select: { role: true } },
      contributionPayments: {
        where: { status: "PAID", livemode: stripeLiveMode() },
        select: { id: true },
        take: 1,
      },
      mentorProfile: {
        select: {
          verificationStatus: true,
          charterAcceptedAt: true,
          documents: {
            where: { withdrawnAt: null, reviewStatus: "APPROVED", scanStatus: "CLEAN" },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });
  if (
    !user ||
    user.accountStatus !== "ACTIVE" ||
    !user.emailVerifiedAt ||
    !user.roles.some(({ role }) => role === "MENTOR") ||
    !user.contributionPayments.length ||
    user.mentorProfile?.verificationStatus !== "APPROVED" ||
    !user.mentorProfile.charterAcceptedAt ||
    !user.mentorProfile.documents.length
  )
    throw forbidden();
}

// Only the current presentation can appear. Formal document publication and
// mentorship approval continue to use their existing, separate authorizations.
const visiblePresentation = {
  currentRevision: {
    is: {
      presentedAt: { not: null },
      pitchUrl: { not: null },
      archivedAt: null,
      reviewStatus: { notIn: ["REJECTED", "REVOKED"] },
    },
  },
  founder: {
    adultConfirmedAt: { not: null },
    user: {
      accountStatus: "ACTIVE",
      emailVerifiedAt: { not: null },
      roles: { some: { role: "FOUNDER" } },
    },
  },
} satisfies Prisma.ProjectWhereInput;

const presentationSelect = {
  id: true,
  founderUserId: true,
  founder: { select: { user: { select: { firstName: true, lastName: true } } } },
  currentRevision: {
    select: {
      id: true,
      title: true,
      summary: true,
      sector: true,
      stage: true,
      supportNeeds: true,
      pitchUrl: true,
      socialLinks: true,
      customLinks: true,
      presentedAt: true,
      updatedAt: true,
      brandingImage: { select: { id: true, fullWidth: true, fullHeight: true } },
    },
  },
} satisfies Prisma.ProjectSelect;

type PresentationRow = Prisma.ProjectGetPayload<{ select: typeof presentationSelect }>;

function externalUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function links(value: Prisma.JsonValue): PresentationLink[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== "object") return [];
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const url = externalUrl(item.url);
    return label && label.length <= 80 && url ? [{ label, url }] : [];
  });
}

function presentation(row: PresentationRow, viewerId: string): ProjectPresentation | null {
  const revision = row.currentRevision;
  const pitchUrl = externalUrl(revision?.pitchUrl);
  if (!revision?.presentedAt || !pitchUrl) return null;
  const source = revision.brandingImage;
  const fullUrl = source ? `/api/project-images/${source.id}/full` : null;
  const thumbnailUrl = source ? `/api/project-images/${source.id}/thumbnail` : null;
  return {
    id: row.id,
    revisionId: revision.id,
    title: revision.title,
    summary: revision.summary,
    sector: revision.sector,
    stage: revision.stage,
    supportNeeds: revision.supportNeeds,
    pitchUrl,
    socialLinks: links(revision.socialLinks),
    customLinks: links(revision.customLinks),
    imageId: source?.id ?? null,
    fullUrl,
    thumbnailUrl,
    image:
      source && fullUrl && thumbnailUrl
        ? {
            id: source.id,
            fullUrl,
            thumbnailUrl,
            width: source.fullWidth,
            height: source.fullHeight,
          }
        : null,
    founder: row.founder.user,
    presentedAt: revision.presentedAt.toISOString(),
    updatedAt: revision.updatedAt.toISOString(),
    isOwner: row.founderUserId === viewerId,
  };
}

/** The first 100 most recently updated visible presentations. No request writes. */
export async function listProjectPresentations(
  mentorId: string,
  db: PrismaClient = getDb(),
): Promise<ProjectPresentation[]> {
  await requireProjectCatalogueMentor(mentorId, db);
  const rows = await db.project.findMany({
    where: visiblePresentation,
    select: presentationSelect,
    orderBy: [{ currentRevision: { updatedAt: "desc" } }, { id: "desc" }],
    take: 100,
  });
  return rows.flatMap((row) => {
    const result = presentation(row, mentorId);
    return result ? [result] : [];
  });
}

/** Owners can preview their own visible presentation; mentors need full approval. */
export async function getProjectPresentation(
  viewerId: string,
  projectId: string,
  db: PrismaClient = getDb(),
): Promise<ProjectPresentation | null> {
  if (!uuid.test(viewerId)) throw forbidden();
  const viewer = await db.user.findUnique({
    where: { id: viewerId },
    select: {
      accountStatus: true,
      emailVerifiedAt: true,
      roles: { select: { role: true } },
      founderProfile: { select: { adultConfirmedAt: true } },
      receivedInvitation: { select: { acceptedAt: true } },
    },
  });
  if (!viewer || viewer.accountStatus !== "ACTIVE" || !viewer.emailVerifiedAt) throw forbidden();
  const canOwn =
    viewer.roles.some(({ role }) => role === "FOUNDER") &&
    Boolean(viewer.founderProfile?.adultConfirmedAt) &&
    (!isMentorPreviewEnabled() || Boolean(viewer.receivedInvitation?.acceptedAt));
  if (canOwn) {
    if (!uuid.test(projectId)) return null;
    const owned = await db.project.findFirst({
      where: { ...visiblePresentation, id: projectId, founderUserId: viewerId },
      select: presentationSelect,
    });
    if (owned) return presentation(owned, viewerId);
    // The same not-found response covers an unknown project and another owner's.
    if (!viewer.roles.some(({ role }) => role === "MENTOR")) return null;
  }
  await requireProjectCatalogueMentor(viewerId, db);
  if (!uuid.test(projectId)) return null;
  const row = await db.project.findFirst({
    where: { ...visiblePresentation, id: projectId },
    select: presentationSelect,
  });
  return row ? presentation(row, viewerId) : null;
}
