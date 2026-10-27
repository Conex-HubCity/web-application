import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminService } from "@/lib/admin/service";
import { DomainError } from "@/lib/domain/policies";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import { Link } from "@/components/i18n";
import { AdminBadge, adminLabels, adminDate } from "@/components/admin/shared";
export default async function UserDetail({ params }: { params: Promise<{ userId: string }> }) {
  const actor = await requireAdmin();
  const { userId } = await params;
  const locale = await getLocale();
  const t = await getTranslator();
  const user = await createAdminService()
    .getUser(actor.id, userId)
    .catch((error) => {
      if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
      throw error;
    });
  if (!user) notFound();
  return (
    <>
      <Link className="ad-back" href="/admin/utilisateurs">
        ← {t("Utilisateurs")}
      </Link>
      <div className="ad-heading">
        <h1>
          {user.firstName} {user.lastName}
        </h1>
        <div className="ad-badges">
          {user.roles.map(({ role }) => (
            <AdminBadge key={role} value={role} label={t(adminLabels[role])} />
          ))}
        </div>
      </div>
      <section className="ad-card ad-detail">
        <h2>{t("Informations du compte")}</h2>
        <dl>
          {[
            ["Email", user.email],
            ["Téléphone", user.phone],
            ["Inscription", adminDate(user.createdAt, locale)],
            ["Email vérifié", adminDate(user.emailVerifiedAt, locale)],
            ["Téléphone vérifié", adminDate(user.phoneVerifiedAt, locale)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{t(label!)}</dt>
              <dd>{value || "—"}</dd>
            </div>
          ))}
        </dl>
        <AdminBadge value={user.accountStatus} label={t(adminLabels[user.accountStatus])} />
        {user.mentorProfile && (
          <p className="ad-detail-action">
            <Link className="ad-row-link" href={`/admin/candidatures/${user.id}`}>
              {t("Consulter la candidature mentor")}
            </Link>
          </p>
        )}
      </section>
    </>
  );
}
