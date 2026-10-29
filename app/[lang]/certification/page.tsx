import { isMentorPreviewEnabled } from "@/lib/release";
import { getTranslator } from "@/lib/i18n/server";
import { getLocale } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { CertificationForm } from "@/components/certification-form";
import { getAuthenticatedProfile } from "@/lib/onboarding/profile";
import { logout } from "@/app/actions/auth";
import "@/app/panel.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return {
    title: t("Votre certification — CNX"),
    robots: { index: false, follow: false },
  };
}

export default async function Certification() {
  if (isMentorPreviewEnabled()) redirect(localizePath("/inscription/mentor", await getLocale()));
  const t = await getTranslator();
  const profile = await getAuthenticatedProfile();
  if (!profile.isFounder || profile.isCertified)
    redirect(localizePath("/compte", await getLocale()));
  const waiting = ["PENDING", "IN_REVIEW"].includes(profile.certificationStatus);
  return (
    <div className="auth-page">
      <header className="welcome-header welcome-container">
        <Brand />
        <form action={logout}>
          <button className="panel-logout" type="submit">
            {" "}
            {t("Se déconnecter")}{" "}
          </button>
        </form>
      </header>
      <main className="welcome-container certification-main">
        <section className="certification-card">
          <span className="welcome-eyebrow">
            {" "}
            {t("BIENVENUE,")} {profile.firstName.toLocaleUpperCase("fr")}
          </span>
          <h1>
            {" "}
            {t("Confirmez votre parcours")} <em>WoeAcademy.</em>
          </h1>
          <p>
            {" "}
            {t(
              "Vous n’avez pas encore confirmé votre appartenance à WoeAcademy. Déposez votre justificatif de certification Niveau Rouge pour accéder à votre espace.",
            )}{" "}
          </p>
          {waiting ? (
            <div className="auth-feedback" role="status">
              {" "}
              {t("Votre document a bien été reçu. Sa vérification est en cours.")}{" "}
            </div>
          ) : (
            <CertificationForm />
          )}
          <p className="certification-privacy">{t("Votre document reste confidentiel.")}</p>
        </section>
      </main>
    </div>
  );
}
