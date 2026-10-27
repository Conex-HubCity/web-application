import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminService } from "@/lib/admin/service";
import { DomainError } from "@/lib/domain/policies";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { Link } from "@/components/i18n";
import { AdminBadge, adminLabels, adminDate } from "@/components/admin/shared";
export default async function Application({ params }: { params: Promise<{ userId: string }> }) {
  const actor = await requireAdmin();
  const { userId } = await params;
  const locale = await getLocale();
  const t = await getTranslator();
  const profile = await createAdminService()
    .getApplication(actor.id, userId)
    .catch((error) => {
      if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
      throw error;
    });
  if (!profile) notFound();
  return (
    <>
      <Link className="ad-back" href="/admin">
        ← {t("Candidatures mentors")}
      </Link>
      <div className="ad-heading">
        <h1>
          {profile.user.firstName} {profile.user.lastName}
        </h1>
        <p>{profile.professionalTitle || t("Mentor Connex")}</p>
        <AdminBadge
          value={profile.verificationStatus}
          label={t(adminLabels[profile.verificationStatus])}
        />
      </div>
      <div className="ad-detail-grid">
        <section className="ad-card ad-detail">
          <h2>{t("Profil du candidat")}</h2>
          <dl>
            {[
              ["Email", profile.user.email],
              ["Localisation", [profile.city, profile.countryCode].filter(Boolean).join(", ")],
              ["Expertises", profile.expertise.join(", ")],
              ["Langues", profile.languages.join(", ")],
              ["Soumission", adminDate(profile.submittedAt, locale)],
              ["Engagements acceptés", adminDate(profile.charterAcceptedAt, locale)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{t(label!)}</dt>
                <dd>{value || "—"}</dd>
              </div>
            ))}
          </dl>
          <h3>{t("Présentation")}</h3>
          <p className="ad-biography">{profile.biography || "—"}</p>
          <Link href={`/admin/utilisateurs/${userId}`}>{t("Voir la fiche utilisateur")}</Link>
        </section>
        <section className="ad-card ad-detail">
          <h2>{t("Justificatifs transmis")}</h2>
          <ul className="ad-documents">
            {profile.documents.map((doc) => (
              <li key={doc.id}>
                <strong>{doc.originalFilename}</strong>
                <small>
                  {t(adminLabels[doc.documentType])} · {Math.ceil(Number(doc.sizeBytes) / 1024)} Ko
                  · {adminDate(doc.uploadedAt, locale)}
                </small>
                <div className="ad-badges">
                  <AdminBadge value={doc.reviewStatus} label={t(adminLabels[doc.reviewStatus])} />
                  <span>
                    {t("Analyse :")} {t(adminLabels[doc.scanStatus] || doc.scanStatus)}
                  </span>
                </div>
                {doc.withdrawnAt ? (
                  <span>{t("Document retiré")}</span>
                ) : doc.scanStatus === "REJECTED" ? (
                  <span>{t("Document indisponible")}</span>
                ) : (
                  <a
                    className="ad-row-link"
                    href={localizePath(`/admin/documents/${doc.id}`, locale)}
                  >
                    {t("Télécharger")}
                  </a>
                )}
              </li>
            ))}
          </ul>
          {!profile.documents.length && <p>{t("Aucun document transmis.")}</p>}
        </section>
      </div>
      <section className="ad-card ad-detail">
        <h2>{t("Historique des décisions")}</h2>
        {profile.validationDecisions.length ? (
          <ol className="ad-history">
            {profile.validationDecisions.map((decision) => (
              <li key={decision.id}>
                <div>
                  <AdminBadge value={decision.outcome} label={t(adminLabels[decision.outcome])} />
                  <small>
                    {adminDate(decision.decidedAt, locale)} · {decision.reviewer.firstName}{" "}
                    {decision.reviewer.lastName}
                  </small>
                </div>
                {decision.reason && <p>{decision.reason}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p>{t("Aucune décision enregistrée.")}</p>
        )}
      </section>
    </>
  );
}
