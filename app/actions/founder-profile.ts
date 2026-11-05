"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { actionPath } from "@/lib/i18n/action-locale";
import { saveFounderProfile } from "@/lib/domain/founder-profile";
import { DomainError } from "@/lib/domain/policies";
import { ProfilePhotoError } from "@/lib/profile-photos";

export type FounderProfileState = { error?: string; success?: string } | null;
export async function updateFounderProfile(
  _state: FounderProfileState,
  form: FormData,
): Promise<FounderProfileState> {
  const user = await getCurrentUser();
  if (!user) redirect(await actionPath("/connexion"));
  try {
    await saveFounderProfile(user.id, form);
  } catch (error) {
    return {
      error:
        error instanceof DomainError || error instanceof ProfilePhotoError
          ? error.message
          : "Votre profil n’a pas pu être enregistré. Réessayez.",
    };
  }
  revalidatePath("/[lang]/compte", "page");
  revalidatePath("/[lang]/compte/projet/apercu", "page");
  revalidatePath("/[lang]/mentor/projets", "layout");
  return { success: "Profil enregistré." };
}
