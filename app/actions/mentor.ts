"use server";

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
  if (!user) redirect("/connexion");
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
  revalidatePath("/compte");
  revalidatePath("/mentor/candidature");
  revalidatePath("/mentor/validation");
  redirect("/mentor/validation");
}

export async function refreshMentorStatus() {
  if (!(await getCurrentUser())) redirect("/connexion");
  revalidatePath("/compte");
  revalidatePath("/mentor/validation");
  redirect("/compte");
}
