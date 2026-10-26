"use client";
import { Link, LanguageSwitcher, useTranslations } from "@/components/i18n";

export function Brand() {
  const t = useTranslations();
  return (
    <div className="cnx-brand-group">
      <Link href="/" className="cnx-brand" aria-label={t("Conex, accueil")}>
        <span className="cnx-brand-symbol" aria-hidden="true">
          <i />
          <i />
        </span>
        conex<span className="cnx-brand-dot">.</span>
      </Link>
      <LanguageSwitcher />
    </div>
  );
}
