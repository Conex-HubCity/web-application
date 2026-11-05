import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { storeProfilePhoto, removeProfilePhoto } from "@/lib/profile-photos";
import { requireFounderAccount } from "./founder-access";
import { DomainError } from "./policies";

export async function saveFounderProfile(
  userId: string,
  form: FormData,
  db: PrismaClient = getDb(),
  photoDirectory?: string,
) {
  function text(name: string, max: number, required = false) {
    const input = form.get(name);
    if (input !== null && typeof input !== "string")
      throw new DomainError("INVALID_PROFILE", "Vérifiez les champs de votre profil.");
    const value = (input ?? "").trim();
    if (value.length > max || (required && !value))
      throw new DomainError("INVALID_PROFILE", "Vérifiez les champs de votre profil.");
    return value;
  }
  const firstName = text("firstName", 100, true);
  const lastName = text("lastName", 100, true);
  const rawPhone = text("phone", 32);
  const phone = rawPhone.replace(/[ ()-]/g, "");
  const biography = text("biography", 4000);
  const city = text("city", 150);
  const countryCode = text("countryCode", 2).toUpperCase();
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode))
    throw new DomainError(
      "INVALID_PROFILE",
      "Utilisez un code pays de deux lettres, par exemple TG.",
    );
  if (rawPhone && !/^\+?\d{6,20}$/.test(phone))
    throw new DomainError("INVALID_PROFILE", "Saisissez un numéro de téléphone valide.");
  await requireFounderAccount(userId, db);
  const file = form.get("profilePhoto");
  const removePhoto = form.get("removeProfilePhoto") === "true";
  const hasPhoto = file instanceof File && file.size > 0;
  if (file !== null && !(file instanceof File))
    throw new DomainError("INVALID_PROFILE", "Choisissez une photo JPG ou PNG valide.");
  if (hasPhoto && removePhoto)
    throw new DomainError("INVALID_PROFILE", "Vérifiez les champs de votre profil.");
  const photoId = hasPhoto ? await storeProfilePhoto(file, photoDirectory) : null;
  let previousPhotoId: string | null = null;
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      await requireFounderAccount(userId, tx);
      const current = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { phone: true, profilePhotoId: true },
      });
      previousPhotoId = current.profilePhotoId;
      await tx.user.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          phone: phone || null,
          ...(current.phone !== (phone || null) ? { phoneVerifiedAt: null } : {}),
          ...(photoId || removePhoto ? { profilePhotoId: photoId } : {}),
        },
      });
      await tx.founderProfile.update({
        where: { userId },
        data: {
          biography: biography || null,
          city: city || null,
          countryCode: countryCode || null,
        },
      });
    });
  } catch (error) {
    if (photoId) await removeProfilePhoto(photoId, photoDirectory).catch(() => {});
    if (error && typeof error === "object" && "code" in error && error.code === "P2002")
      throw new DomainError("PHONE_IN_USE", "Ce numéro de téléphone est déjà utilisé.");
    throw error;
  }
  if ((photoId || removePhoto) && previousPhotoId)
    await removeProfilePhoto(previousPhotoId, photoDirectory).catch(() => {});
}
