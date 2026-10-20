import type { Metadata } from "next";
import { AuthEntry } from "@/components/auth-entry";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
export const metadata: Metadata = { title: "Créer mon compte porteur de projet — Conex" };
export default async function CandidateRegistration() {
  if (await getCurrentUser()) redirect("/compte");
  return <AuthEntry mode="register" initialRole="porteur" />;
}
