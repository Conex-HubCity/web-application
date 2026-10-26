import english from "./en.json";
import type { Locale } from "./config";
// Source-language keys keep the first migration incremental. Unknown text stays in French.
export function translator(locale: Locale) {
  return (message: string) =>
    locale === "en" ? ((english as Record<string, string>)[message] ?? message) : message;
}
