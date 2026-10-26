import "server-only";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, localizePath } from "./config";
export async function actionPath(path: string) {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return localizePath(path, isLocale(value) ? value : defaultLocale);
}
