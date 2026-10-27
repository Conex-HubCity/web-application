"use client";
import { useActionState } from "react";
import { confirmEmail, requestEmailCode } from "@/app/actions/email-verification";
import { useTranslations } from "@/components/i18n";
export function EmailVerificationForm({ sent }: { sent: boolean }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(confirmEmail, null);
  const [resend, resendAction, resending] = useActionState(requestEmailCode, null);
  return (
    <div className="email-verification-forms">
      {(sent || resend?.success) && (
        <form action={action} className="auth-form">
          <label>
            {t("Code de vérification")}
            <input
              className="email-otp-input"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
              disabled={pending}
              aria-describedby="email-otp-help"
            />
          </label>
          <p id="email-otp-help" className="auth-field-hint">
            {t("Le code est valable 10 minutes.")}
          </p>
          {state?.error && (
            <p className="auth-error" role="alert">
              {t(state.error)}
            </p>
          )}
          <button className="auth-submit" type="submit" disabled={pending || resending}>
            {t(pending ? "Vérification…" : "Confirmer mon email")}
          </button>
        </form>
      )}
      <form action={resendAction} className="email-resend-form">
        {resend?.error && (
          <p className="auth-error" role="alert">
            {t(resend.error)}
          </p>
        )}
        {resend?.success && <p role="status">{t(resend.success)}</p>}
        <button type="submit" className="email-resend-button" disabled={pending || resending}>
          {t(
            resending
              ? "Envoi en cours…"
              : sent || resend?.success
                ? "Renvoyer un code"
                : "Recevoir mon code",
          )}
        </button>
      </form>
    </div>
  );
}
