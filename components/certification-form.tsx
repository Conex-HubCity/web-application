"use client";

import { useActionState } from "react";
import { uploadCertification } from "@/app/actions/certification";
import { Icon } from "./icon";

export function CertificationForm() {
  const [state, action, pending] = useActionState(uploadCertification, null);
  if (state?.received)
    return (
      <p className="auth-feedback" role="status">
        Votre document a bien été reçu. Nous vous informerons après sa vérification.
      </p>
    );
  return (
    <form action={action} className="auth-form certification-form">
      <label className="certification-upload">
        <Icon name="document" size={28} />
        <strong>Votre justificatif WoeAcademy</strong>
        <span>5 Mo maximum</span>
        <input name="document" type="file" required disabled={pending} />
      </label>
      {state?.error && (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="auth-submit" disabled={pending}>
        {pending ? "Dépôt en cours…" : "Envoyer mon document"}
        <Icon name="arrow" size={18} />
      </button>
    </form>
  );
}
