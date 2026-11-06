"use client";
import Image from "next/image";
import { Link, LanguageSwitcher, useTranslations } from "@/components/i18n";

export function Brand({
  full = false,
  label,
  showLanguageSwitcher = true,
}: {
  full?: boolean;
  label?: string;
  showLanguageSwitcher?: boolean;
}) {
  const t = useTranslations();
  return (
    <div className="cnx-brand-group">
      <Link
        href="/"
        className={full ? "cnx-brand cnx-brand-image" : "cnx-brand cnx-brand-short"}
        aria-label={t("CNX, accueil")}
      >
        {full ? (
          <Image
            src="/assets/conex/cnx-logo-transparent.png"
            alt="CNX"
            width={1774}
            height={887}
            sizes="(max-width: 600px) 124px, 160px"
            className="cnx-brand-logo"
          />
        ) : (
          <>
            <span className="cnx-brand-symbol" aria-hidden="true">
              <i />
              <i />
            </span>
            CNX
            <span className="cnx-brand-dot">.</span>
          </>
        )}
      </Link>
      {showLanguageSwitcher && <LanguageSwitcher />}
      {label && <span className="cnx-brand-label">{label}</span>}
    </div>
  );
}
