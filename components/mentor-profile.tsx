"use client";
import { useTranslations } from "@/components/i18n";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateMentorProfile, uploadMentorDocuments } from "@/app/actions/mentor";
import type { MentorDashboardData } from "@/lib/domain/mentor-dashboard";
import { Icon } from "./icon";

const labels: Record<string, string> = {
  APPROVED: "Accepté",
  PENDING: "En attente",
  IN_REVIEW: "En cours d’examen",
  REJECTED: "À compléter",
  REVOKED: "À réexaminer",
  DRAFT: "Brouillon",
};

export function MentorProfile({ data }: { data: MentorDashboardData }) {
  const t = useTranslations();
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateMentorProfile, null);
  const [upload, uploadAction, uploading] = useActionState(uploadMentorDocuments, null);
  const uploadForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (upload?.success) uploadForm.current?.reset();
  }, [upload]);
  const initials = (data.firstName.charAt(0) + (data.lastName?.charAt(0) ?? "")).toUpperCase();
  return (
    <div className="md-profile-grid">
      <section className="md-card md-profile-card">
        <div className="md-profile-title">
          <div className="md-profile-heading">
            <span className="md-avatar md-large-avatar">{initials}</span>
            <div>
              <h2>
                {data.firstName} {data.lastName}
              </h2>
              <p>{data.professionalTitle || t("Mentor Connex")}</p>
            </div>
          </div>
          {!editing && (
            <button type="button" className="md-outline" onClick={() => setEditing(true)}>
              {" "}
              {t("Modifier mon profil")}{" "}
            </button>
          )}
        </div>
        {editing ? (
          <form action={action} className="md-profile-form">
            <fieldset disabled={pending}>
              <label>
                {" "}
                {t("Prénom")}{" "}
                <input
                  name="firstName"
                  autoComplete="given-name"
                  defaultValue={data.firstName}
                  maxLength={100}
                  required
                />
              </label>
              <label>
                {" "}
                {t("Nom")}{" "}
                <input
                  name="lastName"
                  autoComplete="family-name"
                  defaultValue={data.lastName ?? ""}
                  maxLength={100}
                  required
                />
              </label>
              <label>
                {" "}
                {t("Email")} <input type="email" value={data.email ?? ""} readOnly />
              </label>
              <label>
                {" "}
                {t("Activité professionnelle")}{" "}
                <input
                  name="professionalTitle"
                  defaultValue={data.professionalTitle ?? ""}
                  maxLength={200}
                />
              </label>
              <label>
                {" "}
                {t("Présentation")}{" "}
                <textarea
                  name="biography"
                  rows={5}
                  defaultValue={data.biography ?? ""}
                  maxLength={4000}
                />
              </label>
              <label>
                {" "}
                {t("Ville")}{" "}
                <input
                  name="city"
                  autoComplete="address-level2"
                  defaultValue={data.city ?? ""}
                  maxLength={150}
                />
              </label>
              <label>
                {" "}
                {t("Code pays")}{" "}
                <input
                  name="countryCode"
                  placeholder="TG"
                  defaultValue={data.countryCode ?? ""}
                  minLength={2}
                  maxLength={2}
                  pattern="[A-Za-z]{2}"
                />
              </label>
              <label>
                {" "}
                {t("Expertises")}{" "}
                <input name="expertise" defaultValue={data.expertise.join(", ")} maxLength={2000} />
                <small>{t("Séparez les expertises par des virgules.")}</small>
              </label>
              <label>
                {" "}
                {t("Langues")}{" "}
                <input name="languages" defaultValue={data.languages.join(", ")} maxLength={2000} />
                <small>{t("Séparez les langues par des virgules.")}</small>
              </label>
              <label>
                {" "}
                {t("Visibilité")}{" "}
                <select name="visibility" defaultValue={data.visibility}>
                  <option value="PRIVATE">{t("Profil privé")}</option>
                  <option value="PLATFORM">{t("Visible sur Connex")}</option>
                </select>
              </label>
            </fieldset>
            {state?.error && (
              <p className="md-form-error" role="alert">
                {t(state.error)}
              </p>
            )}
            {state?.success && (
              <p className="md-form-success" role="status">
                {t(state.success)}
              </p>
            )}
            <div className="md-form-actions">
              <button className="md-primary" type="submit" disabled={pending}>
                {pending ? t("Enregistrement…") : t("Enregistrer")}
              </button>
              <button
                className="md-outline"
                type="button"
                disabled={pending}
                onClick={() => setEditing(false)}
              >
                {" "}
                {t("Fermer")}{" "}
              </button>
            </div>
          </form>
        ) : (
          <>
            {data.biography && <p className="md-biography">{data.biography}</p>}
            <dl className="md-profile-details">
              <div>
                <dt>{t("Email")}</dt>
                <dd>{data.email || t("Non renseigné")}</dd>
              </div>
              <div>
                <dt>{t("Localisation")}</dt>
                <dd>
                  {[data.city, data.countryCode].filter(Boolean).join(", ") || t("Non renseignée")}
                </dd>
              </div>
              <div>
                <dt>{t("Expertises")}</dt>
                <dd>{data.expertise.join(", ") || t("À compléter")}</dd>
              </div>
              <div>
                <dt>{t("Langues")}</dt>
                <dd>{data.languages.join(", ") || t("À compléter")}</dd>
              </div>
              <div>
                <dt>{t("Visibilité")}</dt>
                <dd>
                  <Icon name="lock" size={14} />
                  {data.visibility === "PRIVATE" ? t("Profil privé") : t("Visible sur Connex")}
                </dd>
              </div>
            </dl>
          </>
        )}
      </section>
      <details className="md-card md-profile-card md-document-disclosure">
        <summary>
          {" "}
          {t("Mes justificatifs")} <span>{data.documents.length}</span>
        </summary>
        <ul className="md-documents">
          {data.documents.map((doc) => (
            <li key={doc.id}>
              <Icon name="document" size={20} />
              <span>
                {doc.name}
                <small>{doc.type === "CV" ? "CV" : t("Justificatif d’expérience")}</small>
              </span>
              <span className="md-tag">{t(labels[doc.status] ?? doc.status)}</span>
            </li>
          ))}
        </ul>
        <form ref={uploadForm} action={uploadAction} className="md-profile-form md-upload-form">
          <h3>{t("Ajouter des documents")}</h3>
          <fieldset disabled={uploading}>
            <label>
              {" "}
              {t("Type de document")}{" "}
              <select name="documentType">
                <option value="CV">CV</option>
                <option value="OTHER_EVIDENCE">{t("Justificatif d’expérience")}</option>
              </select>
            </label>
            <label>
              {" "}
              {t("Fichiers")}{" "}
              <input
                type="file"
                name="documents"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                multiple
                required
              />
              <small>{t("PDF, Word ou images. Cinq fichiers et 5 Mo au total maximum.")}</small>
            </label>
          </fieldset>
          {upload?.error && (
            <p className="md-form-error" role="alert">
              {t(upload.error)}
            </p>
          )}
          {upload?.success && (
            <p className="md-form-success" role="status">
              {t(upload.success)}
            </p>
          )}
          <div>
            <button className="md-primary" type="submit" disabled={uploading}>
              {uploading ? t("Envoi en cours…") : t("Envoyer les documents")}
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
