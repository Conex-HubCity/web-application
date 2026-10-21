import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createOnboardingService } from "./service";

export async function getAuthenticatedProfile() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const profile = await createOnboardingService().getProfile(user.id);
  if (!profile) redirect("/connexion");
  return profile;
}
