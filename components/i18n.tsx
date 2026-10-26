"use client";
import { createContext, useContext } from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { localizePath, type Locale } from "@/lib/i18n/config";
import { translator } from "@/lib/i18n/messages";
const LocaleContext = createContext<Locale>("fr");
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}
export function useLocale() {
  return useContext(LocaleContext);
}
export function useTranslations() {
  return translator(useLocale());
}
export function Link({ href, ...props }: React.ComponentProps<typeof NextLink>) {
  const locale = useLocale();
  return (
    <NextLink
      {...props}
      href={
        typeof href === "string"
          ? localizePath(href, locale)
          : {
              ...href,
              pathname: href.pathname ? localizePath(href.pathname, locale) : href.pathname,
            }
      }
    />
  );
}
export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <select
      className="cnx-language-select"
      aria-label={locale === "fr" ? "Langue" : "Language"}
      value={locale}
      onChange={(event) =>
        router.push(
          localizePath(pathname, event.target.value as Locale) +
            window.location.search +
            window.location.hash,
        )
      }
    >
      <option value="fr" lang="fr">
        FR
      </option>
      <option value="en" lang="en">
        EN
      </option>
    </select>
  );
}
