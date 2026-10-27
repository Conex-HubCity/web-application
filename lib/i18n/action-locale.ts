import "server-only";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, localizePath } from "./config";
export async function getActionLocale() {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function actionPath(path: string) {
  return localizePath(path, await getActionLocale());
}
