import type { Metadata } from "next";
import { AuthEntry } from "@/components/auth-entry";
export const metadata: Metadata = { title: "Créer mon compte porteur de projet — Conex" };
export default function CandidateRegistration() { return <AuthEntry mode="register" initialRole="porteur" />; }
