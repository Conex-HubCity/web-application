"use client";
import { useActionState } from "react";
import { useTranslations } from "@/components/i18n";
import { startContribution } from "@/app/actions/contribution";
export function ContributionForm({ available }: { available: boolean }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(startContribution, null);
  return (
    <form action={action} className="auth-form">
      {state?.error && (
        <p className="auth-error" role="alert">
          {t(state.error)}
        </p>
      )}
      <button className="auth-submit" type="submit" disabled={!available || pending}>
        {pending ? t("Redirection vers Stripe…") : t("Contribuer — 30 USD")}
      </button>
      {!available && (
        <p className="auth-field-hint">{t("Le paiement sera disponible prochainement.")}</p>
      )}
    </form>
  );
}
