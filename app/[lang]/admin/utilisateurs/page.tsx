import { requireAdmin } from "@/lib/admin/auth";
import { createAdminService, type AdminQuery } from "@/lib/admin/service";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { Link } from "@/components/i18n";
import { AdminBadge, AdminPagination, adminLabels, adminDate } from "@/components/admin/shared";
export default async function Users({ searchParams }: { searchParams: Promise<AdminQuery> }) {
  const actor = await requireAdmin();
  const locale = await getLocale();
  const t = await getTranslator();
  const data = await createAdminService().listUsers(actor.id, await searchParams);
  return (
    <>
      <div className="ad-heading">
        <span>{t("ADMINISTRATION")}</span>
        <h1>{t("Utilisateurs")}</h1>
        <Link className="ad-row-link" href="/admin/utilisateurs/inviter">
          {t("Inviter un porteur de projet")}
        </Link>
        <p>{t("Consultez les comptes inscrits, leurs rôles et leur statut.")}</p>
      </div>
      <section className="ad-card">
        <form className="ad-filters" action={localizePath("/admin/utilisateurs", locale)}>
          <label>
            {t("Rechercher")}
            <input
              name="q"
              maxLength={180}
              defaultValue={data.filters.q}
              placeholder={t("Nom ou email")}
            />
          </label>
          <label>
            {t("Rôle")}
            <select name="role" defaultValue={data.filters.role}>
              <option value="">{t("Tous les rôles")}</option>
              {["MENTOR", "FOUNDER", "ADMIN"].map((role) => (
                <option key={role} value={role}>
                  {t(adminLabels[role])}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Statut")}
            <select name="status" defaultValue={data.filters.status}>
              <option value="">{t("Tous les statuts")}</option>
              {["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "CLOSED"].map((status) => (
                <option key={status} value={status}>
                  {t(adminLabels[status])}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">{t("Filtrer")}</button>
          <Link href="/admin/utilisateurs">{t("Réinitialiser")}</Link>
        </form>
        <div className="ad-table-wrap">
          <table>
            <caption className="sr-only">{t("Utilisateurs")}</caption>
            <thead>
              <tr>
                {["Nom", "Rôle", "Compte", "Inscription", "Fiche"].map((label) => (
                  <th key={label}>{t(label)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>
                      {user.firstName} {user.lastName}
                    </strong>
                    <small>{user.email}</small>
                  </td>
                  <td>
                    <div className="ad-badges">
                      {user.roles.map(({ role }) => (
                        <AdminBadge key={role} value={role} label={t(adminLabels[role])} />
                      ))}
                    </div>
                  </td>
                  <td>
                    <AdminBadge
                      value={user.accountStatus}
                      label={t(adminLabels[user.accountStatus])}
                    />
                  </td>
                  <td>{adminDate(user.createdAt, locale)}</td>
                  <td>
                    <Link className="ad-row-link" href={`/admin/utilisateurs/${user.id}`}>
                      {t("Consulter")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.rows.length && (
          <p className="ad-empty">{t("Aucun utilisateur ne correspond à ces critères.")}</p>
        )}
        <AdminPagination
          base="/admin/utilisateurs"
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
