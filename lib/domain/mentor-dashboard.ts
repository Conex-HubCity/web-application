import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { requireProjectCatalogueMentor } from "./project-catalogue";
import { DomainError } from "./policies";

export async function getMentorDashboard(userId: string, db: PrismaClient = getDb()) {
  try {
    await requireProjectCatalogueMentor(userId, db);
  } catch (error) {
    if (error instanceof DomainError) return null;
    throw error;
  }
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
  const [requests, mentorships] = await Promise.all([
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
