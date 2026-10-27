import { redirect } from "next/navigation";
import { actionPath } from "@/lib/i18n/action-locale";
import "server-only";
import { cookies } from "next/headers";
import { createAuthService } from "./service";

export const SESSION_COOKIE = "conex_session";

export async function getCurrentUser(options: { allowUnverified?: boolean } = {}) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await createAuthService().getSession(token);
  if (user && !user.emailVerifiedAt && !options.allowUnverified)
    redirect(await actionPath("/verification-email"));
  return user;
}

export async function saveSession(session: { token: string; expiresAt: Date }) {
  const jar = await cookies();
  await createAuthService().logout(jar.get(SESSION_COOKIE)?.value);
  jar.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
}
