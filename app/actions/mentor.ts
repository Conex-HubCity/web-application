"use server";
import { actionPath } from "@/lib/i18n/action-locale";

import { saveMentorProfile } from "@/lib/domain/mentor-profile";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/service";
import { createMentorOnboardingService } from "@/lib/onboarding/mentor-service";

export type MentorSubmissionState = { error: string } | null;

export async function submitMentorApplication(
  _state: MentorSubmissionState,
  form: FormData,
): Promise<MentorSubmissionState> {
  const user = await getCurrentUser();
  if (!user) redirect(await actionPath("/connexion"));
  try {
    const cv = form.get("cv");
    const evidence = form.getAll("evidence");
    const documents: { file: File; documentType: "CV" | "OTHER_EVIDENCE" }[] = [];
    if (cv instanceof File && cv.size > 0) documents.push({ file: cv, documentType: "CV" });
    for (const file of evidence)
      if (file instanceof File && file.size > 0)
        documents.push({ file, documentType: "OTHER_EVIDENCE" });
    await createMentorOnboardingService().submit(user.id, {
      documents,
      charterAccepted: form.get("charterAccepted") === "on",
      professionalTitle: form.get("professionalTitle"),
      biography: form.get("biography"),
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    console.error(
      "Mentor application failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return { error: "Votre dossier n’a pas pu être envoyé. Veuillez réessayer." };
  }
  revalidatePath("/[lang]/compte", "page");
  revalidatePath("/[lang]/mentor/candidature", "page");
  revalidatePath("/[lang]/mentor/validation", "page");
  redirect(await actionPath("/mentor/validation"));
}

export async function refreshMentorStatus() {
  if (!(await getCurrentUser())) redirect(await actionPath("/connexion"));
  revalidatePath("/[lang]/compte", "page");
  revalidatePath("/[lang]/mentor/validation", "page");
  redirect(await actionPath("/compte"));
}

export type MentorProfileState = { error?: string; success?: string } | null;

export async function updateMentorProfile(
  _state: MentorProfileState,
  form: FormData,
): Promise<MentorProfileState> {
  const user = await getCurrentUser();
  if (!user) redirect(await actionPath("/connexion"));
  try {
    await saveMentorProfile(user.id, form);
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    console.error(
      "Mentor profile update failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return { error: "Votre profil n’a pas pu être enregistré." };
  }
  revalidatePath("/[lang]/compte", "page");
  return { success: "Votre profil a été enregistré." };
}

export async function uploadMentorDocuments(
  _state: MentorProfileState,
  form: FormData,
): Promise<MentorProfileState> {
  const user = await getCurrentUser();
  if (!user) redirect(await actionPath("/connexion"));
  const type = form.get("documentType");
  if (type !== "CV" && type !== "OTHER_EVIDENCE")
    return { error: "Choisissez un type de document." };
  const documents: { file: File; documentType: "CV" | "OTHER_EVIDENCE" }[] = form
    .getAll("documents")
    .filter((file): file is File => file instanceof File && file.size > 0)
    .map((file) => ({ file, documentType: type }));
  try {
    await createMentorOnboardingService().submit(
      user.id,
      { documents, charterAccepted: false },
      true,
    );
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    console.error("Mentor upload failed", error instanceof Error ? error.name : "UnknownError");
    return { error: "Vos documents n’ont pas pu être envoyés." };
  }
  revalidatePath("/[lang]/compte", "page");
  return { success: "Documents envoyés. Ils sont en attente d’examen." };
}
