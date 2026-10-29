import { getTranslator } from "@/lib/i18n/server";
export default async function ProjectLoading() {
  const t = await getTranslator();
  return (
    <div className="md-empty" role="status">
      {t("Chargement de votre espace…")}
    </div>
  );
}
