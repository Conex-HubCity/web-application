"use client";
import { usePathname } from "next/navigation";
import { Link, useTranslations } from "@/components/i18n";
import { Icon } from "@/components/icon";
export function AdminNavigation() {
  const path = usePathname();
  const t = useTranslations();
  return (
    <nav className="ad-navigation" aria-label={t("Navigation administrateur")}>
      {[
        {
          href: "/admin",
          label: "Candidatures mentors",
          icon: "document",
          selected: !path.includes("/admin/utilisateurs"),
        },
        {
          href: "/admin/utilisateurs",
          label: "Utilisateurs",
          icon: "people",
          selected: path.includes("/admin/utilisateurs"),
        },
      ].map((item) => (
        <Link key={item.href} href={item.href} aria-current={item.selected ? "page" : undefined}>
          <Icon name={item.icon} size={18} />
          {t(item.label)}
        </Link>
      ))}
    </nav>
  );
}
