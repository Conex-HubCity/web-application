"use client";
import { useActionState, useEffect, useState } from "react";
import { Link, useLocale, useTranslations } from "@/components/i18n";
import {
  requestPasswordReset,
  definePassword,
  inspectPasswordLink,
  inviteFounder,
} from "@/app/actions/password";

export function ForgotPasswordForm() {
  const t = useTranslations();
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  if (state?.success) return <p role="status">{t(state.success)}</p>;
  return (
    <form action={action} className="auth-form">
      <label>
        {t("Email")}
        <input name="email" type="email" required maxLength={254} autoComplete="email" />
      </label>
      <button className="auth-submit" disabled={pending}>
        {t(pending ? "Un instant…" : "Recevoir le lien")}
      </button>
    </form>
  );
}
export function DefinePasswordForm() {
  const t = useTranslations();
  const [token, setToken] = useState("");
  const [info, setInfo] = useState<{ purpose: "RESET" | "INVITATION" } | null | undefined>(
    undefined,
  );
  useEffect(() => {
    let active = true;
    let generation = 0;
    const readLink = () => {
      const current = ++generation;
      const value = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
      setToken(value);
      setInfo(undefined);
      const form = new FormData();
      form.set("token", value);
      inspectPasswordLink(form)
        .then((result) => {
          if (active && current === generation) setInfo(result);
        })
        .catch(() => {
          if (active && current === generation) setInfo(null);
        });
    };
    readLink();
    window.addEventListener("hashchange", readLink);
    return () => {
      active = false;
      window.removeEventListener("hashchange", readLink);
    };
  }, []);
  if (info === undefined) return <p role="status">{t("Chargement…")}</p>;
  if (!info)
    return (
      <>
        <p role="alert">{t("Ce lien est invalide ou a expiré. Demandez un nouveau lien.")}</p>
        <Link href="/mot-de-passe-oublie">{t("Recevoir un nouveau lien")}</Link>
      </>
    );
  return <PasswordFields key={token} token={token} invitation={info.purpose === "INVITATION"} />;
}
function PasswordFields({ token, invitation }: { token: string; invitation: boolean }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(definePassword, null);
  useEffect(() => {
    if (state?.success) window.history.replaceState(null, "", window.location.pathname);
  }, [state?.success]);
  if (state?.success)
    return (
      <>
        <p role="status">{t(state.success)}</p>
        <Link className="auth-submit" href="/connexion">
          {t("Se connecter")}
        </Link>
      </>
    );
  return (
    <form action={action} className="auth-form">
      <input name="token" type="hidden" value={token} />
      <label>
        {t("Nouveau mot de passe")}
        <input
          name="password"
          type="password"
          minLength={8}
          maxLength={128}
          required
          autoComplete="new-password"
        />
      </label>
      <span className="auth-field-hint">{t("8 caractères minimum.")}</span>
      <label>
        {t("Confirmer le mot de passe")}
        <input
          name="passwordConfirmation"
          type="password"
          minLength={8}
          maxLength={128}
          required
          autoComplete="new-password"
        />
      </label>
      {invitation && (
        <label className="auth-checkbox">
          <input name="adultConfirmed" type="checkbox" required />
          <span>{t("Je confirme avoir 18 ans ou plus.")}</span>
        </label>
      )}
      {state?.error && (
        <p className="auth-error" role="alert">
          {t(state.error)}
        </p>
      )}
      <button className="auth-submit" disabled={pending}>
        {t(pending ? "Un instant…" : "Enregistrer mon mot de passe")}
      </button>
    </form>
  );
}
export function InviteFounderForm() {
  const t = useTranslations();
  const locale = useLocale();
  const [state, action, pending] = useActionState(inviteFounder, null);
  return (
    <form action={action} className="auth-form">
      <label>
        {t("Nom")}
        <input name="lastName" maxLength={100} required autoComplete="family-name" />
      </label>
      <label>
        {t("Prénom")}
        <input name="firstName" maxLength={60} required autoComplete="given-name" />
      </label>
      <label>
        {t("Email")}
        <input name="email" type="email" maxLength={254} required autoComplete="email" />
      </label>
      <label>
        {t("Langue de l’invitation")}
        <select name="language" defaultValue={locale}>
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </label>
      {state?.success && <p role="status">{t(state.success)}</p>}
      {state?.error && (
        <p className="auth-error" role="alert">
          {t(state.error)}
        </p>
      )}
      <button className="auth-submit" disabled={pending}>
        {t(pending ? "Envoi en cours…" : "Envoyer l’invitation")}
      </button>
    </form>
  );
}
