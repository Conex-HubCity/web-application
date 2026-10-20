import type { Metadata } from "next";
import { AuthEntry } from "@/components/auth-entry";
export const metadata: Metadata = { title: "Devenir mentor — Conex" };
export default function MentorRegistration() {
  return <AuthEntry mode="register" initialRole="mentor" />;
}
