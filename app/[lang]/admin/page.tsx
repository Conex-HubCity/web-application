import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminService, type AdminQuery } from "@/lib/admin/service";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { Link } from "@/components/i18n";
import { AdminBadge, AdminPagination, adminLabels, adminDate } from "@/components/admin/shared";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("Administration — CNX") };
}
export default async function Admin({ searchParams }: { searchParams: Promise<AdminQuery> }) {
  const actor = await requireAdmin();
  const locale = await getLocale();
  const t = await getTranslator();
  const data = await createAdminService().listApplications(actor.id, await searchParams);
  return (
    <>
      <div className="ad-heading">
        <span>{t("ADMINISTRATION")}</span>
        <h1>{t("Candidatures mentors")}</h1>
        <p>{t("Retrouvez les dossiers transmis et leur état de validation.")}</p>
      </div>
      <div className="ad-stats">
        {[
          { label: "Utilisateurs inscrits", value: data.counts.users },
          { label: "Candidatures en attente", value: data.counts.pending },
          { label: "Mentors acceptés", value: data.counts.approved },
        ].map((item) => (
          <div key={item.label}>
            <span>{t(item.label)}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <section className="ad-card">
        <form className="ad-filters" action={localizePath("/admin", locale)}>
          <label>
            {t("Rechercher")}
            <input
              name="q"
              defaultValue={data.filters.q}
              maxLength={180}
              placeholder={t("Nom ou email")}
            />
          </label>
          <label>
            {t("Statut")}
            <select name="status" defaultValue={data.filters.status}>
              <option value="">{t("Tous les statuts")}</option>
              {["PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "REVOKED", "DRAFT"].map(
                (status) => (
                  <option key={status} value={status}>
                    {t(adminLabels[status])}
                  </option>
                ),
              )}
            </select>
          </label>
          <button type="submit">{t("Filtrer")}</button>
          <Link href="/admin">{t("Réinitialiser")}</Link>
        </form>
        <div className="ad-table-wrap">
          <table>
            <caption className="sr-only">{t("Candidatures mentors")}</caption>
            <thead>
              <tr>
                {["Mentor", "Statut", "Soumission", "Documents", "Dossier"].map((label) => (
                  <th key={label}>{t(label)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((profile) => (
                <tr key={profile.userId}>
                  <td>
                    <strong>
                      {profile.user.firstName} {profile.user.lastName}
                    </strong>
                    <small>{profile.user.email}</small>
                    <small>{profile.professionalTitle}</small>
                  </td>
                  <td>
                    <AdminBadge
                      value={profile.verificationStatus}
                      label={t(adminLabels[profile.verificationStatus])}
                    />
                  </td>
                  <td>{adminDate(profile.submittedAt, locale)}</td>
                  <td>{profile._count.documents}</td>
                  <td>
                    <Link className="ad-row-link" href={`/admin/candidatures/${profile.userId}`}>
                      {t("Consulter")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.rows.length && (
          <p className="ad-empty">{t("Aucune candidature ne correspond à ces critères.")}</p>
        )}
        <AdminPagination
          base="/admin"
          {...data}
          filters={data.filters}
          previous={t("Précédent")}
          next={t("Suivant")}
          summary={t("Résultats :")}
        />
      </section>
    </>
  );
}
