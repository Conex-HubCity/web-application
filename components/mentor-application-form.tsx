"use client";

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
  const [state, action, pending] = useActionState(submitMentorApplication, null);
  return (
    <form action={action} className="auth-form mentor-application-form">
      <label>
        Votre activité <span className="mentor-optional">(facultatif)</span>
        <input
          name="professionalTitle"
          maxLength={200}
          defaultValue={professionalTitle ?? ""}
          autoComplete="organization-title"
        />
      </label>
      <label>
        Votre expérience <span className="mentor-optional">(facultatif)</span>
        <textarea name="biography" rows={4} maxLength={4000} defaultValue={biography ?? ""} />
      </label>
      <label className="mentor-file-field">
        Votre CV <input name="cv" type="file" accept={accept} disabled={pending} />
      </label>
      <label className="mentor-file-field">
        Autres justificatifs{" "}
        <input name="evidence" type="file" accept={accept} multiple disabled={pending} />
        <span className="auth-field-hint">Diplômes, certificats ou attestations d’expérience.</span>
      </label>
      <p className="auth-field-hint">
        Au moins un document. PDF, Word ou images ; cinq fichiers et 5 Mo au total maximum.
      </p>
      <details className="mentor-charter">
        <summary>Les engagements du mentor</summary>
        <ul>
          <li>Préserver la confidentialité des projets et des documents reçus.</li>
          <li>
            Présenter son expérience avec exactitude et respecter ses disponibilités annoncées.
          </li>
          <li>
            Construire une relation choisie, respectueuse et sans promesse de financement ou
            d’emploi.
          </li>
          <li>Participer aux échanges et aux bilans convenus avec le porteur de projet.</li>
        </ul>
      </details>
      <label className="auth-checkbox">
        <input name="charterAccepted" type="checkbox" required />
        <span>Je m’engage à respecter les engagements du mentor ci-dessus.</span>
      </label>
      {state?.error && (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="auth-submit" disabled={pending}>
        {pending
          ? "Envoi en cours…"
          : resubmission
            ? "Soumettre à nouveau mon dossier"
            : "Soumettre mon dossier"}
      </button>
    </form>
  );
}
