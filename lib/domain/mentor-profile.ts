import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { AuthError } from "@/lib/auth/service";

export async function saveMentorProfile(
  userId: string,
  form: FormData,
  db: PrismaClient = getDb(),
) {
  function text(name: string, max: number, required = false) {
    const value = form.get(name);
    if (typeof value !== "string" || value.trim().length > max || (required && !value.trim()))
      throw new AuthError("Vérifiez les champs de votre profil.");
    return value.trim();
  }
  const firstName = text("firstName", 100, true);
  const lastName = text("lastName", 100, true);
  const professionalTitle = text("professionalTitle", 200);
  const biography = text("biography", 4000);
  const city = text("city", 150);
  const countryCode = text("countryCode", 2).toUpperCase();
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode))
    throw new AuthError("Utilisez un code pays de deux lettres, par exemple TG.");
  function list(name: string) {
    const values = [
      ...new Set(
        text(name, 2000)
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
    if (values.length > 20 || values.some((value) => value.length > 100))
      throw new AuthError("Limitez les listes à vingt éléments de 100 caractères maximum.");
    return values;
  }
  const expertise = list("expertise");
  const languages = list("languages");
  const visibilityPreference = form.get("visibility");
  if (visibilityPreference !== "PRIVATE" && visibilityPreference !== "PLATFORM")
    throw new AuthError("Choisissez la visibilité de votre profil.");
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { roles: true, mentorProfile: true },
    });
    if (
      !user ||
      ["SUSPENDED", "CLOSED"].includes(user.accountStatus) ||
      !user.roles.some(({ role }) => role === "MENTOR") ||
      user.mentorProfile?.verificationStatus !== "APPROVED"
    )
      throw new AuthError("La modification est réservée aux mentors validés.");
    await tx.user.update({ where: { id: userId }, data: { firstName, lastName } });
    await tx.mentorProfile.update({
      where: { userId },
      data: {
        professionalTitle: professionalTitle || null,
        biography: biography || null,
        city: city || null,
        countryCode: countryCode || null,
        expertise,
        languages,
        visibilityPreference,
        visibilityRequestedAt:
          visibilityPreference === "PRIVATE"
            ? null
            : (user.mentorProfile.visibilityRequestedAt ?? new Date()),
      },
    });
  });
}
