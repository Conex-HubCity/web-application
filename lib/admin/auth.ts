import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
export const requireAdmin = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect(localizePath("/connexion", await getLocale()));
  if (!user.roles.some(({ role }) => role === "ADMIN")) notFound();
  return user;
});
