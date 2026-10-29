import { refreshContributionReturn } from "@/app/actions/contribution";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { Link } from "@/components/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { createContributionService } from "@/lib/payments/service";
import "@/app/panel.css";
export async function generateMetadata(): Promise<Metadata> {
  return { title: "CNX", robots: { index: false, follow: false } };
}
export default async function ContributionReturn({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) redirect(localizePath("/connexion", locale));
  const { session_id: sessionId } = await searchParams;
  if (!sessionId || !/^cs_(test_|live_)?[A-Za-z0-9_]{1,240}$/.test(sessionId))
    redirect(localizePath("/contribution", locale));
  let paid = false;
  try {
    paid = (await createContributionService().reconcile(user.id, sessionId)).paid;
  } catch {
    /* A query string alone never confirms payment. Webhooks can still complete it. */
  }
  if (paid) redirect(localizePath("/contribution", locale));
  const t = await getTranslator();
  return (
    <div className="auth-page">
      <header className="welcome-header welcome-container">
        <Brand />
      </header>
      <main className="welcome-container certification-main">
        <section className="certification-card">
          <h1>{t("Vérification de votre paiement")}</h1>
          <p>
            {t(
              "Votre paiement n’est pas encore confirmé. Vous pourrez continuer dès réception de la confirmation Stripe.",
            )}
          </p>
          <form action={refreshContributionReturn}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <button className="auth-submit" type="submit">
              {t("Vérifier à nouveau")}
            </button>
          </form>
          <Link className="contribution-home" href="/contribution">
            {t("Revenir à ma contribution")}
          </Link>
        </section>
      </main>
    </div>
  );
}
