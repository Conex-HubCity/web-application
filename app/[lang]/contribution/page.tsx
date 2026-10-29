import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { Link } from "@/components/i18n";
import { ContributionForm } from "@/components/contribution-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { stripeReady, stripeLiveMode } from "@/lib/payments/config";
import { createContributionService } from "@/lib/payments/service";
import { logout } from "@/app/actions/auth";
import { refreshContribution } from "@/app/actions/contribution";
import "@/app/panel.css";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("Soutenir CNX"), robots: { index: false, follow: false } };
}
export default async function Contribution({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) redirect(localizePath("/connexion", locale));
  if (!user.roles.some(({ role }) => role === "MENTOR")) redirect(localizePath("/compte", locale));
  const status = await createContributionService().status(user.id);
  const { cancelled } = await searchParams;
  const t = await getTranslator();
  return (
    <div className="auth-page">
      <header className="welcome-header welcome-container">
        <Brand />
        <form action={logout}>
          <button className="panel-logout" type="submit">
            {t("Se déconnecter")}
          </button>
        </form>
      </header>
      <main className="welcome-container certification-main">
        <section className="certification-card contribution-card">
          <h1>{t(status.paid ? "Merci de soutenir CNX." : "Soutenir CNX")}</h1>
          {status.paid ? (
            <Link className="auth-submit" href="/mentor/candidature">
              {t("Devenir mentor")}
            </Link>
          ) : (
            <>
              <p>
                {t(
                  "Ce paiement est un soutien au projet et ne donne droit à aucune part dans celui-ci.",
                )}
              </p>
              <div className="contribution-price">
                <strong>
                  30 <span>USD</span>
                </strong>
                <span>{t("Paiement unique")}</span>
              </div>
              {cancelled === "1" && (
                <p role="status">{t("Paiement interrompu. Vous pouvez réessayer.")}</p>
              )}
              {status.latestStatus === "REFUNDED" && (
                <p role="status">{t("Votre précédente contribution a été remboursée.")}</p>
              )}
              {status.latestStatus === "PENDING" && (
                <form action={refreshContribution}>
                  <button className="contribution-refresh" type="submit">
                    {t("Vérifier la confirmation du paiement")}
                  </button>
                </form>
              )}
              {stripeReady() && !stripeLiveMode() && (
                <p className="contribution-test">{t("Mode test : aucun débit réel.")}</p>
              )}
              <ContributionForm available={stripeReady()} />
            </>
          )}
          <Link className="contribution-home" href="/">
            {t("Revenir à l’accueil")}
          </Link>
        </section>
      </main>
    </div>
  );
}
