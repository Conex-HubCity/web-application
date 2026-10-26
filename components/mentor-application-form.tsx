"use client";
import { useTranslations } from "@/components/i18n";

import { useActionState } from "react";
import { submitMentorApplication } from "@/app/actions/mentor";

const accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp";
export function MentorApplicationForm({
  resubmission = false,
  professionalTitle,
  biography,
}: {
  resubmission?: boolean;
  professionalTitle?: string | null;
  biography?: string | null;
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(submitMentorApplication, null);
  return (
    <form action={action} className="auth-form mentor-application-form">
      <label>
        {" "}
        {t("Votre activité")} <span className="mentor-optional">{t("(facultatif)")}</span>
        <input
          name="professionalTitle"
          maxLength={200}
          defaultValue={professionalTitle ?? ""}
          autoComplete="organization-title"
        />
      </label>
      <label>
        {" "}
        {t("Votre expérience")} <span className="mentor-optional">{t("(facultatif)")}</span>
        <textarea name="biography" rows={4} maxLength={4000} defaultValue={biography ?? ""} />
      </label>
      <label className="mentor-file-field">
        {" "}
        {t("Votre CV")} <input name="cv" type="file" accept={accept} disabled={pending} />
      </label>
      <label className="mentor-file-field">
        {" "}
        {t("Autres justificatifs")}{" "}
        <input name="evidence" type="file" accept={accept} multiple disabled={pending} />
        <span className="auth-field-hint">
          {t("Diplômes, certificats ou attestations d’expérience.")}
        </span>
      </label>
      <p className="auth-field-hint">
        {" "}
        {t(
          "Au moins un document. PDF, Word ou images ; cinq fichiers et 5 Mo au total maximum.",
        )}{" "}
      </p>
      <details className="mentor-charter">
        <summary>{t("Les engagements du mentor")}</summary>
        <ul>
          <li>{t("Préserver la confidentialité des projets et des documents reçus.")}</li>
          <li>
            {" "}
            {t(
              "Présenter son expérience avec exactitude et respecter ses disponibilités annoncées.",
            )}{" "}
          </li>
          <li>
            {" "}
            {t(
              "Construire une relation choisie, respectueuse et sans promesse de financement ou d’emploi.",
            )}{" "}
          </li>
          <li>{t("Participer aux échanges et aux bilans convenus avec le porteur de projet.")}</li>
        </ul>
      </details>
      <label className="auth-checkbox">
        <input name="charterAccepted" type="checkbox" required />
        <span>{t("Je m’engage à respecter les engagements du mentor ci-dessus.")}</span>
      </label>
      {state?.error && (
        <p className="auth-error" role="alert">
          {t(state.error)}
        </p>
      )}
      <button type="submit" className="auth-submit" disabled={pending}>
        {pending
          ? t("Envoi en cours…")
          : resubmission
            ? t("Soumettre à nouveau mon dossier")
            : t("Soumettre mon dossier")}
      </button>
    </form>
  );
}
