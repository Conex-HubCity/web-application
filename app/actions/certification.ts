"use server";
import { isMentorPreviewEnabled } from "@/lib/release";
import { actionPath } from "@/lib/i18n/action-locale";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/service";
import { createOnboardingService } from "@/lib/onboarding/service";

export type CertificationState = { error?: string; received?: boolean } | null;

export async function uploadCertification(
  _state: CertificationState,
  form: FormData,
): Promise<CertificationState> {
  const user = await getCurrentUser();
  if (!user) redirect(await actionPath("/connexion"));
  let certified = false;
  if (isMentorPreviewEnabled())
    return { error: "L’accès des porteurs de projet n’est pas encore ouvert." };
  try {
    const file = form.get("document");
    if (!(file instanceof File)) return { error: "Choisissez un document à déposer." };
    const result = await createOnboardingService().uploadCertification(user.id, file);
    certified = result.certified;
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    console.error(
      "Certification upload failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return { error: "Le document n’a pas pu être déposé. Veuillez réessayer." };
  }
  revalidatePath("/[lang]/compte", "page");
  revalidatePath("/[lang]/certification", "page");
  if (certified) redirect(await actionPath("/compte"));
  return { received: true };
}
