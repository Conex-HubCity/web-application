import "server-only";
import { getLocale } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createOnboardingService } from "./service";

export async function getAuthenticatedProfile() {
  const user = await getCurrentUser();
  if (!user) redirect(localizePath("/connexion", await getLocale()));
  const profile = await createOnboardingService().getProfile(user.id);
  if (!profile) redirect(localizePath("/connexion", await getLocale()));
  return profile;
}
