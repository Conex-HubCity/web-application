import type { Metadata } from "next";
import { AuthEntry } from "@/components/auth-entry";
export const metadata: Metadata = { title: "Se connecter — Conex" };
export default function Login() { return <AuthEntry mode="login" />; }
