import { Link } from "@/components/i18n";
export const adminLabels: Record<string, string> = {
  ACTIVE: "Actif",
  PENDING_VERIFICATION: "Contact à vérifier",
  SUSPENDED: "Suspendu",
  CLOSED: "Fermé",
  DRAFT: "Brouillon",
  PENDING: "En attente",
  IN_REVIEW: "En cours d’examen",
  APPROVED: "Accepté",
  REJECTED: "Refusé",
  REVOKED: "Validation retirée",
  CHANGES_REQUESTED: "Complément demandé",
  MENTOR: "Mentor",
  FOUNDER: "Porteur de projet",
  ADMIN: "Administrateur",
  CLEAN: "Contrôlé",
  ERROR: "Analyse en erreur",
  CV: "CV",
  CERTIFICATE: "Certificat",
  DEGREE: "Diplôme",
  WORK_REFERENCE: "Attestation professionnelle",
  OTHER_EVIDENCE: "Justificatif d’expérience",
};
export function AdminBadge({ value, label }: { value: string; label: string }) {
  return <span className={`ad-badge ad-status-${value.toLowerCase()}`}>{label}</span>;
}
export function adminDate(value: Date | null, locale: string) {
  return value
    ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(value)
    : "—";
}
export function AdminPagination({
  base,
  page,
  pages,
  total,
  filters,
  previous,
  next,
  summary,
}: {
  base: string;
  page: number;
  pages: number;
  total: number;
  filters: Record<string, string>;
  previous: string;
  next: string;
  summary: string;
}) {
  const href = (value: number) => {
    const params = new URLSearchParams({ ...filters, page: String(value) });
    return `${base}?${params}`;
  };
  return (
    <footer className="ad-pagination">
      <span>
        {summary} {total} · {page} / {pages}
      </span>
      <div>
        {page > 1 && <Link href={href(page - 1)}>{previous}</Link>}
        {page < pages && <Link href={href(page + 1)}>{next}</Link>}
      </div>
    </footer>
  );
}
