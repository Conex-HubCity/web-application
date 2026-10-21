import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { createPlatformService } from "./platform-service";
import { DomainError } from "./policies";

export async function getMentorDashboard(userId: string, db: PrismaClient = getDb()) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      accountStatus: true,
      emailVerifiedAt: true,
      phoneVerifiedAt: true,
      roles: { select: { role: true } },
      mentorProfile: {
        select: {
          professionalTitle: true,
          biography: true,
          expertise: true,
          languages: true,
          city: true,
          countryCode: true,
          visibilityPreference: true,
          verificationStatus: true,
          charterAcceptedAt: true,
          documents: {
            where: { withdrawnAt: null },
            select: {
              id: true,
              originalFilename: true,
              documentType: true,
              reviewStatus: true,
              scanStatus: true,
            },
          },
        },
      },
    },
  });
  if (
    !user ||
    ["SUSPENDED", "CLOSED"].includes(user.accountStatus) ||
    !user.roles.some(({ role }) => role === "MENTOR") ||
    !user.mentorProfile
  )
    return null;
  const profile = user.mentorProfile;
  if (
    profile.verificationStatus !== "APPROVED" ||
    !profile.charterAcceptedAt ||
    !profile.documents.some((doc) => doc.reviewStatus === "APPROVED" && doc.scanStatus === "CLEAN")
  )
    return null;
  const now = new Date();
  const [activeMembership, lastMembership, requests, mentorships] = await Promise.all([
    db.membership.findFirst({
      where: {
        mentorUserId: userId,
        status: "ACTIVE",
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      orderBy: { endsAt: "desc" },
      select: { status: true, startsAt: true, endsAt: true },
    }),
    db.membership.findFirst({
      where: { mentorUserId: userId },
      orderBy: { createdAt: "desc" },
      select: { status: true, startsAt: true, endsAt: true },
    }),
    db.mentorshipRequest.findMany({
      where: { mentorUserId: userId },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        id: true,
        status: true,
        message: true,
        introMeetingAt: true,
        projectRevision: {
          select: {
            title: true,
            project: { select: { founder: { select: { user: { select: { firstName: true } } } } } },
          },
        },
      },
    }),
    db.mentorship.findMany({
      where: { request: { mentorUserId: userId }, status: { in: ["ACTIVE", "PAUSED"] } },
      orderBy: { activatedAt: "desc" },
      take: 12,
      select: {
        id: true,
        status: true,
        request: {
          select: {
            projectRevision: {
              select: {
                title: true,
                project: {
                  select: { founder: { select: { user: { select: { firstName: true } } } } },
                },
              },
            },
          },
        },
        followUps: {
          where: { status: "APPROVED" },
          orderBy: { occurredAt: "desc" },
          take: 1,
          select: { occurredAt: true },
        },
      },
    }),
  ]);
  let canBrowse = Boolean(
    activeMembership &&
    user.accountStatus === "ACTIVE" &&
    (user.emailVerifiedAt || user.phoneVerifiedAt),
  );
  let projects: {
    id: string;
    title: string;
    summary: string | null;
    sector: string | null;
    supportNeeds: string | null;
  }[] = [];
  if (canBrowse) {
    try {
      const available = await createPlatformService(db).listAvailableProjects(userId);
      projects = available
        .flatMap((project) =>
          project.currentRevision
            ? [
                {
                  id: project.id,
                  title: project.currentRevision.title,
                  summary: project.currentRevision.summary,
                  sector: project.currentRevision.sector,
                  supportNeeds: project.currentRevision.supportNeeds.join(", ") || null,
                },
              ]
            : [],
        )
        .slice(0, 6);
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      canBrowse = false;
    }
  }
  const membership = activeMembership ?? lastMembership;
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    professionalTitle: profile.professionalTitle,
    biography: profile.biography,
    expertise: profile.expertise,
    languages: profile.languages,
    city: profile.city,
    countryCode: profile.countryCode,
    visibility: profile.visibilityPreference,
    documents: profile.documents.map(({ id, originalFilename, documentType, reviewStatus }) => ({
      id,
      name: originalFilename,
      type: documentType,
      status: reviewStatus,
    })),
    membership: membership
      ? {
          status: membership.status,
          startsAt: membership.startsAt?.toISOString() ?? null,
          endsAt: membership.endsAt?.toISOString() ?? null,
        }
      : null,
    membershipActive: Boolean(activeMembership),
    canBrowse,
    projects,
    requests: requests.map((request) => ({
      id: request.id,
      status: request.status,
      message: request.message,
      project: request.projectRevision.title,
      founder: request.projectRevision.project.founder.user.firstName,
      meetingAt: request.introMeetingAt?.toISOString() ?? null,
    })),
    mentorships: mentorships.map((mentorship) => ({
      id: mentorship.id,
      status: mentorship.status,
      project: mentorship.request.projectRevision.title,
      founder: mentorship.request.projectRevision.project.founder.user.firstName,
      lastFollowUpAt: mentorship.followUps[0]?.occurredAt?.toISOString() ?? null,
    })),
  };
}

export type MentorDashboardData = NonNullable<Awaited<ReturnType<typeof getMentorDashboard>>>;
