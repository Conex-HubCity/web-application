"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, saveSession } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/service";
import { createEmailVerificationService } from "@/lib/auth/email-verification";
import { actionPath, getActionLocale } from "@/lib/i18n/action-locale";
export type EmailVerificationState = { error?: string; success?: string } | null;
export async function confirmEmail(
  _state: EmailVerificationState,
  form: FormData,
): Promise<EmailVerificationState> {
  const user = await getCurrentUser({ allowUnverified: true });
  if (!user) redirect(await actionPath("/connexion"));
  if (user.emailVerifiedAt) redirect(await actionPath("/compte"));
  try {
    const session = await createEmailVerificationService().verify(user.id, form.get("code"));
    await saveSession(session);
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    console.error(
      "Email verification failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return { error: "La vérification n’a pas pu aboutir. Réessayez." };
  }
  revalidatePath("/[lang]", "layout");
  redirect(await actionPath("/compte"));
}
export async function requestEmailCode(): Promise<EmailVerificationState> {
  const user = await getCurrentUser({ allowUnverified: true });
  if (!user) redirect(await actionPath("/connexion"));
  if (user.emailVerifiedAt) redirect(await actionPath("/compte"));
  let sent = false;
  try {
    sent = await createEmailVerificationService().issue(user.id, await getActionLocale());
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    console.error("Email code unavailable", error instanceof Error ? error.name : "UnknownError");
    return { error: "L’envoi du code est momentanément indisponible. Réessayez plus tard." };
  }
  if (!sent) redirect(await actionPath("/compte"));
  revalidatePath("/[lang]/verification-email", "page");
  return { success: "Un nouveau code vous a été envoyé." };
}
