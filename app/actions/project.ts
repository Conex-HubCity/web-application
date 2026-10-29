"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { actionPath } from "@/lib/i18n/action-locale";
import { saveFounderProject } from "@/lib/domain/founder-dashboard";
import { DomainError } from "@/lib/domain/policies";
export type ProjectState = { error?: string; success?: string } | null;
export async function saveProject(_state: ProjectState, form: FormData): Promise<ProjectState> {
  const user = await getCurrentUser();
  if (!user) redirect(await actionPath("/connexion"));
  try {
    await saveFounderProject(user.id, form);
  } catch (error) {
    return {
      error:
        error instanceof DomainError
          ? error.message
          : "Votre projet n’a pas pu être enregistré. Réessayez.",
    };
  }
  revalidatePath("/[lang]/compte", "page");
  revalidatePath("/[lang]/mentor/projets", "page");
  revalidatePath("/[lang]/mentor/projets/[projectId]", "page");
  return { success: "Votre projet est visible aux mentors." };
}
