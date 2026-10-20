import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="cnx-brand" aria-label="Conex, accueil">
      <span className="cnx-brand-symbol" aria-hidden="true"><i /><i /></span>
      conex<span className="cnx-brand-dot">.</span>
    </Link>
  );
}
