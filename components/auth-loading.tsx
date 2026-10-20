import { Brand } from "./brand";

export default function AuthLoading() {
  return (
    <div className="auth-page">
      <header className="welcome-header welcome-container">
        <Brand />
      </header>
      <main className="welcome-container account-main">
        <p role="status">Chargement de votre espace…</p>
      </main>
    </div>
  );
}
