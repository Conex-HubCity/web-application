import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { Brand } from "@/components/brand";
import { AdminNavigation } from "@/components/admin/navigation";
import AuthLoading from "@/components/auth-loading";
import { getTranslator } from "@/lib/i18n/server";
import { logout } from "@/app/actions/auth";
import "@/app/admin.css";
export const metadata: Metadata = { robots: { index: false, follow: false } };
async function AdminShell({ children }: { children: React.ReactNode }) {
  const actor = await requireAdmin();
  const t = await getTranslator();
  return (
    <div className="ad-shell">
      <a className="skip-link" href="#admin-main">
        {t("Aller au contenu")}
      </a>
      <header className="ad-header">
        <Brand />
        <div className="ad-identity">
          <span>
            {actor.firstName}
            <small>{t("Administrateur")}</small>
          </span>
          <form action={logout}>
            <button type="submit">{t("Se déconnecter")}</button>
          </form>
        </div>
      </header>
      <AdminNavigation />
      <main id="admin-main">{children}</main>
    </div>
  );
}
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
