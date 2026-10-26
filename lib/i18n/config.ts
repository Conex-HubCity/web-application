export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";
export const LOCALE_COOKIE = "conex_locale";
export function isLocale(value: unknown): value is Locale {
  return value === "fr" || value === "en";
}
export function localizePath(href: string, locale: Locale) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const path = href.replace(/^\/(fr|en)(?=\/|[?#]|$)/, "");
  return `/${locale}${path === "/" ? "" : path}`;
}
export function preferredLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  const candidates = (acceptLanguage ?? "")
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const quality = params.find((value) => value.trim().startsWith("q="));
      const q = quality ? Number(quality.trim().slice(2)) : 1;
      return { locale: tag.split("-")[0], q, index };
    })
    .filter((value) => Number.isFinite(value.q) && value.q > 0 && value.q <= 1)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return (
    (candidates.find((value) => isLocale(value.locale))?.locale as Locale | undefined) ??
    defaultLocale
  );
}
