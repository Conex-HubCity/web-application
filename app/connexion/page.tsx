import type { Metadata } from "next";
import { AuthEntry } from "@/components/auth-entry";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
export const metadata: Metadata = { title: "Se connecter — Conex" };
export default async function Login() {
  if (await getCurrentUser()) redirect("/compte");
  return <AuthEntry mode="login" />;
}
