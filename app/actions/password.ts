"use server";
import { after } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getActionLocale } from "@/lib/i18n/action-locale";
import { createPasswordLinkService } from "@/lib/auth/password-links";
import { AuthError } from "@/lib/auth/service";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/admin/auth";
export type PasswordState = { error?: string; success?: string } | null;
export async function requestPasswordReset(
  _state: PasswordState,
  form: FormData,
): Promise<PasswordState> {
  const email = form.get("email");
  const locale = await getActionLocale();
  // Identical response and response timing for unknown accounts and SMTP failures.
  after(async () => {
    try {
      await createPasswordLinkService().requestReset(email, locale);
    } catch {
      console.error("Password link request could not be delivered");
    }
  });
  return { success: "Si un compte correspond à cette adresse, vous recevrez un lien par email." };
}
export async function inspectPasswordLink(form: FormData) {
  try {
    return await createPasswordLinkService().inspect(form.get("token"));
  } catch {
    return null;
  }
}
export async function definePassword(
  _state: PasswordState,
  form: FormData,
): Promise<PasswordState> {
  try {
    await createPasswordLinkService().setPassword({
      token: form.get("token"),
      password: form.get("password"),
      passwordConfirmation: form.get("passwordConfirmation"),
      adultConfirmed: form.get("adultConfirmed") === "on",
      locale: await getActionLocale(),
    });
    (await cookies()).delete(SESSION_COOKIE);
    return { success: "Votre mot de passe est enregistré. Vous pouvez vous connecter." };
  } catch (error) {
    return {
      error:
        error instanceof AuthError
          ? error.message
          : "Le service est momentanément indisponible. Réessayez dans quelques instants.",
    };
  }
}
export async function inviteFounder(_state: PasswordState, form: FormData): Promise<PasswordState> {
  const actor = await requireAdmin();
  const locale = form.get("language");
  if (locale !== "fr" && locale !== "en") return { error: "Demande invalide." };
  try {
    await createPasswordLinkService().invite(
      actor.id,
      {
        email: form.get("email"),
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
      },
      locale,
    );
    revalidatePath("/[lang]/admin/utilisateurs", "page");
    return {
      success: "Invitation envoyée. La personne recevra un lien pour définir son mot de passe.",
    };
  } catch (error) {
    return {
      error:
        error instanceof AuthError
          ? error.message
          : "L’invitation n’a pas pu être envoyée. Réessayez.",
    };
  }
}
