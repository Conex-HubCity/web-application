"use client";
import { Link, LanguageSwitcher, useTranslations } from "@/components/i18n";

export function Brand({ full = false }: { full?: boolean }) {
  const t = useTranslations();
  return (
    <div className="cnx-brand-group">
      <Link
        href="/"
        className={full ? "cnx-brand" : "cnx-brand cnx-brand-short"}
        aria-label={t(full ? "Connex, accueil" : "CNX, accueil")}
      >
        <span className="cnx-brand-symbol" aria-hidden="true">
          <i />
          <i />
        </span>
        {full ? "connex" : "CNX"}
        <span className="cnx-brand-dot">.</span>
      </Link>
      <LanguageSwitcher />
    </div>
  );
}
