"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError, createAuthService } from "@/lib/auth/service";
import { saveSession, SESSION_COOKIE } from "@/lib/auth/session";

export type AuthState = { error: string } | null;

export async function authenticate(
  mode: "register" | "login",
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  try {
    const service = createAuthService();
    const credentials = { email: form.get("email"), password: form.get("password") };
    const session =
      mode === "register"
        ? await service.register({
            ...credentials,
            passwordConfirmation: form.get("passwordConfirmation"),
            firstName: form.get("firstName"),
            lastName: form.get("lastName"),
            role: form.get("role"),
            adultConfirmed: form.get("adultConfirmed") === "on",
          })
        : mode === "login"
          ? await service.login(credentials)
          : null;
    if (!session) return { error: "Demande invalide." };
    await saveSession(session);
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    // Never return database errors or log credentials, hashes or tokens.
    console.error("Authentication failed", error instanceof Error ? error.name : "UnknownError");
    return {
      error: "Le service est momentanément indisponible. Réessayez dans quelques instants.",
    };
  }
  redirect("/compte");
}

export async function logout() {
  const jar = await cookies();
  await createAuthService().logout(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  redirect("/connexion");
}
