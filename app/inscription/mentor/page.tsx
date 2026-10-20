import type { Metadata } from "next";
import { AuthEntry } from "@/components/auth-entry";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
export const metadata: Metadata = { title: "Devenir mentor — Conex" };
export default async function MentorRegistration() {
  if (await getCurrentUser()) redirect("/compte");
  return <AuthEntry mode="register" initialRole="mentor" />;
}
