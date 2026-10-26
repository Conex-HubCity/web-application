import { getTranslator } from "@/lib/i18n/server";
import { Brand } from "./brand";

export default async function AuthLoading() {
  const t = await getTranslator();
  return (
    <div className="auth-page">
      <header className="welcome-header welcome-container">
        <Brand />
      </header>
      <main className="welcome-container account-main">
        <p role="status">{t("Chargement de votre espace…")}</p>
      </main>
    </div>
  );
}
