import "server-only";
import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { requireCondition } from "@/lib/domain/policies";

const userFields = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  accountStatus: true,
  createdAt: true,
  roles: { select: { role: true } },
} as const;
const statuses = ["DRAFT", "PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "REVOKED"];
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export type AdminQuery = { q?: unknown; status?: unknown; role?: unknown; page?: unknown };
const scalar = (value: unknown) => (typeof value === "string" ? value.trim() : "");
function filters(input: AdminQuery) {
  return {
    q: scalar(input.q).slice(0, 180),
    status: scalar(input.status),
    role: scalar(input.role),
    page: Math.min(100000, Math.max(1, Math.floor(Number(scalar(input.page))) || 1)),
  };
}
const search = (q: string): Prisma.UserWhereInput =>
  q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

export function createAdminService(db: PrismaClient = getDb()) {
  async function authorize(actorId: string) {
    const actor = await db.user.findUnique({
      where: { id: actorId },
      select: { accountStatus: true, emailVerifiedAt: true, roles: { select: { role: true } } },
    });
    requireCondition(
      actor &&
        actor.emailVerifiedAt &&
        !["SUSPENDED", "CLOSED"].includes(actor.accountStatus) &&
        actor.roles.some(({ role }) => role === "ADMIN"),
      "ADMIN_REQUIRED",
      "Accès réservé aux administrateurs.",
    );
  }
  function validId(id: string) {
    requireCondition(uuid.test(id), "NOT_FOUND", "Dossier introuvable.");
  }
  async function paginate<T>(
    total: number,
    page: number,
    fetchRows: (skip: number) => Promise<T[]>,
  ) {
    const pages = Math.max(1, Math.ceil(total / 20));
    const current = Math.min(page, pages);
    return { rows: await fetchRows((current - 1) * 20), total, page: current, pages };
  }
  return {
    async listUsers(actorId: string, input: AdminQuery = {}) {
      await authorize(actorId);
      const f = filters(input);
      const role = ["MENTOR", "FOUNDER", "ADMIN"].includes(f.role)
        ? (f.role as "MENTOR" | "FOUNDER" | "ADMIN")
        : "";
      const status = ["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "CLOSED"].includes(f.status)
        ? (f.status as "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "CLOSED")
        : "";
      const where: Prisma.UserWhereInput = {
        ...search(f.q),
        ...(role ? { roles: { some: { role } } } : {}),
        ...(status ? { accountStatus: status } : {}),
      };
      const total = await db.user.count({ where });
      return {
        ...(await paginate(total, f.page, (skip) =>
          db.user.findMany({
            where,
            skip,
            take: 20,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: { ...userFields, mentorProfile: { select: { verificationStatus: true } } },
          }),
        )),
        filters: { q: f.q, role, status },
      };
    },
    async listApplications(actorId: string, input: AdminQuery = {}) {
      await authorize(actorId);
      const f = filters(input);
      const status = statuses.includes(f.status)
        ? (f.status as "DRAFT" | "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "REVOKED")
        : "";
      const where: Prisma.MentorProfileWhereInput = {
        user: search(f.q),
        OR: [{ submittedAt: { not: null } }, { documents: { some: { withdrawnAt: null } } }],
        ...(status ? { verificationStatus: status } : {}),
      };
      const [total, users, pending, approved] = await Promise.all([
        db.mentorProfile.count({ where }),
        db.user.count(),
        db.mentorProfile.count({
          where: {
            verificationStatus: { in: ["PENDING", "IN_REVIEW"] },
            submittedAt: { not: null },
          },
        }),
        db.mentorProfile.count({ where: { verificationStatus: "APPROVED" } }),
      ]);
      return {
        ...(await paginate(total, f.page, (skip) =>
          db.mentorProfile.findMany({
            where,
            skip,
            take: 20,
            orderBy: [{ submittedAt: { sort: "desc", nulls: "last" } }, { userId: "desc" }],
            select: {
              userId: true,
              professionalTitle: true,
              verificationStatus: true,
              submittedAt: true,
              user: { select: userFields },
              _count: { select: { documents: { where: { withdrawnAt: null } } } },
            },
          }),
        )),
        filters: { q: f.q, status },
        counts: { users, pending, approved },
      };
    },
    async getUser(actorId: string, id: string) {
      await authorize(actorId);
      validId(id);
      return db.user.findUnique({
        where: { id },
        select: {
          ...userFields,
          phone: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
          mentorProfile: { select: { verificationStatus: true, submittedAt: true } },
        },
      });
    },
    async getApplication(actorId: string, id: string) {
      await authorize(actorId);
      validId(id);
      return db.mentorProfile.findUnique({
        where: { userId: id },
        select: {
          userId: true,
          professionalTitle: true,
          biography: true,
          city: true,
          countryCode: true,
          expertise: true,
          languages: true,
          visibilityPreference: true,
          verificationStatus: true,
          submittedAt: true,
          charterAcceptedAt: true,
          charterVersion: true,
          user: { select: userFields },
          documents: {
            orderBy: { uploadedAt: "desc" },
            select: {
              id: true,
              originalFilename: true,
              documentType: true,
              sizeBytes: true,
              uploadedAt: true,
              scanStatus: true,
              reviewStatus: true,
              withdrawnAt: true,
            },
          },
          validationDecisions: {
            orderBy: { decidedAt: "desc" },
            take: 20,
            select: {
              id: true,
              outcome: true,
              reason: true,
              decidedAt: true,
              reviewer: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });
    },
    async getDocument(actorId: string, id: string) {
      await authorize(actorId);
      validId(id);
      const document = await db.mentorDocument.findUnique({
        where: { id },
        select: {
          privateStorageKey: true,
          originalFilename: true,
          checksum: true,
          withdrawnAt: true,
          scanStatus: true,
        },
      });
      requireCondition(
        document && !document.withdrawnAt && document.scanStatus !== "REJECTED",
        "NOT_FOUND",
        "Document indisponible.",
      );
      return document;
    },
  };
}
