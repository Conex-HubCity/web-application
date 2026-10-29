import { NextRequest, NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE, localizePath, preferredLocale } from "@/lib/i18n/config";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const language = pathname.split("/")[1];
  if (isLocale(language)) {
    const response = NextResponse.next();
    if (request.cookies.get(LOCALE_COOKIE)?.value !== language)
      response.cookies.set(LOCALE_COOKIE, language, {
        path: "/",
        sameSite: "lax",
        maxAge: 31536000,
        httpOnly: true,
        secure: request.nextUrl.protocol === "https:",
      });
    return response;
  }
  // Only redirect existing legacy entry points. Unknown locales remain 404s.
  if (
    pathname !== "/" &&
    !/^\/(connexion|inscription|compte|certification|mentor|espace|admin|verification-email|charte-mentorat|contribution|mot-de-passe-oublie|definir-mot-de-passe)(\/|$)/.test(
      pathname,
    )
  )
    return NextResponse.next();
  const locale = preferredLocale(
    request.cookies.get(LOCALE_COOKIE)?.value,
    request.headers.get("accept-language"),
  );
  const url = request.nextUrl.clone();
  url.pathname = localizePath(pathname, locale);
  const response = NextResponse.redirect(url, 307);
  response.headers.set("Vary", "Cookie, Accept-Language");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/((?!api|_next|assets|favicon.ico|robots.txt|sitemap.xml).*)"] };
