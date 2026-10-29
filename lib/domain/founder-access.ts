import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { isMentorPreviewEnabled } from "@/lib/release";
import { DomainError } from "./policies";
export async function requireFounderAccount(userId: string, db: Pick<PrismaClient, "user">) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      accountStatus: true,
      emailVerifiedAt: true,
      roles: { select: { role: true } },
      receivedInvitation: { select: { acceptedAt: true } },
      founderProfile: { select: { adultConfirmedAt: true } },
    },
  });
  if (
    !user ||
    user.accountStatus !== "ACTIVE" ||
    !user.emailVerifiedAt ||
    !user.roles.some(({ role }) => role === "FOUNDER") ||
    !user.founderProfile?.adultConfirmedAt ||
    (isMentorPreviewEnabled() && !user.receivedInvitation?.acceptedAt)
  )
    throw new DomainError(
      "FOUNDER_UNAVAILABLE",
      "Cet espace est réservé aux porteurs de projet autorisés.",
    );
  return user;
}
