import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getCurrentUser } from "@/lib/auth/session";
import { logout } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "Mon compte — Conex",
  robots: { index: false, follow: false },
};
const labels = { FOUNDER: "porteur de projet", MENTOR: "mentor", ADMIN: "administrateur" };

export default async function Account() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return (
    <div className="auth-page">
      <header className="welcome-header welcome-container">
        <Brand />
        <Link className="auth-back" href="/">
          Revenir à l’accueil
        </Link>
      </header>
      <main className="welcome-container account-main">
        <div className="auth-panel account-panel">
          <div className="welcome-eyebrow">VOTRE ESPACE CONEX</div>
          <h1>
            Bienvenue,
            <br />
            <em>{user.firstName}.</em>
          </h1>
          <p className="auth-lead" role="status">
            Vous êtes connecté en tant que{" "}
            <strong>{user.roles.map(({ role }) => labels[role]).join(" et ") || "membre"}</strong>.
          </p>
          {user.accountStatus === "PENDING_VERIFICATION" && (
            <p className="auth-preview-note">
              Votre compte est créé. La vérification de votre adresse email et la validation de
              votre profil seront les prochaines étapes.
            </p>
          )}
          <form action={logout}>
            <button type="submit" className="auth-submit">
              Se déconnecter
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
