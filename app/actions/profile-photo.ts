"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { actionPath } from "@/lib/i18n/action-locale";
import { getDb } from "@/lib/db";
import { ProfilePhotoError, replaceMentorPhoto } from "@/lib/profile-photos";
export async function updateProfilePhoto(
  _state: { error?: string; success?: boolean } | null,
  form: FormData,
) {
  const user = await getCurrentUser();
  if (!user) redirect(await actionPath("/connexion"));
  try {
    await replaceMentorPhoto(getDb(), user.id, form.get("profilePhoto"));
  } catch (error) {
    return {
      error:
        error instanceof ProfilePhotoError
          ? error.message
          : "Impossible d’enregistrer la photo. Réessayez.",
    };
  }
  revalidatePath("/[lang]/compte", "page");
  revalidatePath("/[lang]/mentor/projets", "layout");
  return { success: true };
}
