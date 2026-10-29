import { getTranslator } from "@/lib/i18n/server";

export default async function InvitationLoading() {
  const t = await getTranslator();
  return (
    <section className="ad-card ad-invite" aria-busy="true">
      <p role="status">{t("Chargement…")}</p>
    </section>
  );
}
