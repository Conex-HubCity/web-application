import { getTranslator } from "@/lib/i18n/server";
import { getLocale } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import type { Metadata } from "next";
import { AuthEntry } from "@/components/auth-entry";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("Se connecter — Conex") };
}
export default async function Login() {
  if (await getCurrentUser()) redirect(localizePath("/compte", await getLocale()));
  return <AuthEntry mode="login" />;
}
