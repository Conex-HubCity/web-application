"use client";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "@/components/i18n";
import { localizePath } from "@/lib/i18n/config";
import { Brand } from "./brand";
import { Icon } from "./icon";
import { logout } from "@/app/actions/auth";
import "@/app/mentor-dashboard.css";
import { mentorNavigation, type MentorView } from "@/lib/mentor-navigation";
export function MentorShell({
  data,
  view,
  children,
  onNavigate,
}: {
  data: { firstName: string; lastName?: string | null; membershipActive?: boolean };
  view: MentorView;
  children: ReactNode;
  onNavigate?: (view: MentorView) => void;
}) {
  const t = useTranslations(),
    locale = useLocale(),
    router = useRouter();
  const firstName = data.firstName.charAt(0).toLocaleUpperCase(locale) + data.firstName.slice(1);
  const initials = (data.firstName.charAt(0) + (data.lastName?.charAt(0) ?? "")).toLocaleUpperCase(
    locale,
  );
  const activeLabel = mentorNavigation.find((item) => item.id === view)!.label;
  function go(next: MentorView) {
    if (onNavigate) {
      onNavigate(next);
      return;
    }
    router.push(
      localizePath(next === "projects" ? "/mentor/projets" : `/compte?view=${next}`, locale),
    );
  }
  return (
    <div className="mentor-shell">
      <a href="#mentor-main" className="skip-link">
        {" "}
        {t("Aller au contenu")}{" "}
      </a>
      <aside className="md-sidebar">
        <Brand />
        <div className="md-workspace-label">
          <span /> {t("ESPACE MENTOR")}{" "}
        </div>
        <span className="md-nav-label">{t("MON PARCOURS")}</span>
        <nav aria-label={t("Navigation mentor")}>
          {mentorNavigation.map((item) => (
            <button
              type="button"
              key={item.id}
              data-view={item.id}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => go(item.id)}
            >
              <Icon name={item.icon} size={19} />
              <span>{t(item.label)}</span>
              {item.id === "membership" && data.membershipActive === false && (
                <i aria-label={t("Adhésion à activer")} />
              )}
            </button>
          ))}
        </nav>
        <div className="md-sidebar-bottom">
          <button type="button" className="md-sidebar-user" onClick={() => go("profile")}>
            <span className="md-avatar">{initials}</span>
            <span>
              <strong>
                {firstName} {data.lastName}
              </strong>
              <small>{t("Mentor CNX")}</small>
            </span>
            <Icon name="chevron" size={15} />
          </button>
          <form action={logout}>
            <button type="submit" className="md-signout">
              <Icon name="logout" size={16} /> {t("Se déconnecter")}{" "}
            </button>
          </form>
        </div>
      </aside>
      <div className="md-workspace">
        <header className="md-topbar">
          <div className="md-mobile-brand">
            <Brand />
          </div>
          <div className="md-breadcrumb">
            {" "}
            {t("Mon espace")} <span>/</span>
            <strong>{t(activeLabel)}</strong>
          </div>
          <div className="md-topbar-right">
            <span className="md-approved">
              <Icon name="check" size={13} /> {t("Candidature validée")}{" "}
            </span>
            <button
              className="md-avatar"
              type="button"
              aria-label={t("Ouvrir mon profil")}
              onClick={() => go("profile")}
            >
              {initials}
            </button>
          </div>
        </header>
        <main id="mentor-main" className="md-main">
          {children}
        </main>
      </div>
      <nav className="md-mobile-nav" aria-label={t("Navigation mentor mobile")}>
        {mentorNavigation
          .filter((item) => ["overview", "projects", "mentorships", "profile"].includes(item.id))
          .map((item) => (
            <button
              type="button"
              key={item.id}
              data-view={item.id}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => go(item.id)}
            >
              <Icon name={item.icon} size={20} />
              <span>{t(item.mobile)}</span>
            </button>
          ))}
      </nav>
    </div>
  );
}
