import { requireAdmin } from "@/lib/admin/auth";
import { getTranslator } from "@/lib/i18n/server";
import { InviteFounderForm } from "@/components/password-forms";
import { Link } from "@/components/i18n";
import "@/app/panel.css";
export default async function InviteFounder() {
  await requireAdmin();
  const t = await getTranslator();
  return (
    <>
      <Link className="ad-back" href="/admin/utilisateurs">
        ← {t("Utilisateurs")}
      </Link>
      <div className="ad-heading">
        <h1>{t("Inviter un porteur de projet")}</h1>
        <p>{t("Un lien lui permettra de définir son mot de passe.")}</p>
      </div>
      <section className="ad-card ad-invite">
        <InviteFounderForm />
      </section>
    </>
  );
}
