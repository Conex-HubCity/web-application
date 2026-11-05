import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { DomainError } from "./policies";
export async function requireFounderAccount(userId: string, db: Pick<PrismaClient, "user">) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      profilePhotoId: true,
      accountStatus: true,
      emailVerifiedAt: true,
      roles: { select: { role: true } },
      founderProfile: { select: { userId: true, biography: true, city: true, countryCode: true } },
    },
  });
  if (
    !user ||
    user.accountStatus !== "ACTIVE" ||
    !user.emailVerifiedAt ||
    !user.roles.some(({ role }) => role === "FOUNDER") ||
    !user.founderProfile
  )
    throw new DomainError(
      "FOUNDER_UNAVAILABLE",
      "Cet espace est réservé aux porteurs de projet autorisés.",
    );
  return user;
}
