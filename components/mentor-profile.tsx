"use client";

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
              <p>{data.professionalTitle || "Mentor Conex"}</p>
            </div>
          </div>
          {!editing && (
            <button type="button" className="md-outline" onClick={() => setEditing(true)}>
              Modifier mon profil
            </button>
          )}
        </div>
        {editing ? (
          <form action={action} className="md-profile-form">
            <fieldset disabled={pending}>
              <label>
                Prénom
                <input
                  name="firstName"
                  autoComplete="given-name"
                  defaultValue={data.firstName}
                  maxLength={100}
                  required
                />
              </label>
              <label>
                Nom
                <input
                  name="lastName"
                  autoComplete="family-name"
                  defaultValue={data.lastName ?? ""}
                  maxLength={100}
                  required
                />
              </label>
              <label>
                Email
                <input type="email" value={data.email ?? ""} readOnly />
              </label>
              <label>
                Activité professionnelle
                <input
                  name="professionalTitle"
                  defaultValue={data.professionalTitle ?? ""}
                  maxLength={200}
                />
              </label>
              <label>
                Présentation
                <textarea
                  name="biography"
                  rows={5}
                  defaultValue={data.biography ?? ""}
                  maxLength={4000}
                />
              </label>
              <label>
                Ville
                <input
                  name="city"
                  autoComplete="address-level2"
                  defaultValue={data.city ?? ""}
                  maxLength={150}
                />
              </label>
              <label>
                Code pays
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
                Expertises
                <input name="expertise" defaultValue={data.expertise.join(", ")} maxLength={2000} />
                <small>Séparez les expertises par des virgules.</small>
              </label>
              <label>
                Langues
                <input name="languages" defaultValue={data.languages.join(", ")} maxLength={2000} />
                <small>Séparez les langues par des virgules.</small>
              </label>
              <label>
                Visibilité
                <select name="visibility" defaultValue={data.visibility}>
                  <option value="PRIVATE">Profil privé</option>
                  <option value="PLATFORM">Visible sur Conex</option>
                </select>
              </label>
            </fieldset>
            {state?.error && (
              <p className="md-form-error" role="alert">
                {state.error}
              </p>
            )}
            {state?.success && (
              <p className="md-form-success" role="status">
                {state.success}
              </p>
            )}
            <div className="md-form-actions">
              <button className="md-primary" type="submit" disabled={pending}>
                {pending ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                className="md-outline"
                type="button"
                disabled={pending}
                onClick={() => setEditing(false)}
              >
                Fermer
              </button>
            </div>
          </form>
        ) : (
          <>
            {data.biography && <p className="md-biography">{data.biography}</p>}
            <dl className="md-profile-details">
              <div>
                <dt>Email</dt>
                <dd>{data.email || "Non renseigné"}</dd>
              </div>
              <div>
                <dt>Localisation</dt>
                <dd>
                  {[data.city, data.countryCode].filter(Boolean).join(", ") || "Non renseignée"}
                </dd>
              </div>
              <div>
                <dt>Expertises</dt>
                <dd>{data.expertise.join(", ") || "À compléter"}</dd>
              </div>
              <div>
                <dt>Langues</dt>
                <dd>{data.languages.join(", ") || "À compléter"}</dd>
              </div>
              <div>
                <dt>Visibilité</dt>
                <dd>
                  <Icon name="lock" size={14} />
                  {data.visibility === "PRIVATE" ? "Profil privé" : "Visible sur Conex"}
                </dd>
              </div>
            </dl>
          </>
        )}
      </section>
      <details className="md-card md-profile-card md-document-disclosure">
        <summary>
          Mes justificatifs <span>{data.documents.length}</span>
        </summary>
        <ul className="md-documents">
          {data.documents.map((doc) => (
            <li key={doc.id}>
              <Icon name="document" size={20} />
              <span>
                {doc.name}
                <small>{doc.type === "CV" ? "CV" : "Justificatif d’expérience"}</small>
              </span>
              <span className="md-tag">{labels[doc.status] ?? doc.status}</span>
            </li>
          ))}
        </ul>
        <form ref={uploadForm} action={uploadAction} className="md-profile-form md-upload-form">
          <h3>Ajouter des documents</h3>
          <fieldset disabled={uploading}>
            <label>
              Type de document
              <select name="documentType">
                <option value="CV">CV</option>
                <option value="OTHER_EVIDENCE">Justificatif d’expérience</option>
              </select>
            </label>
            <label>
              Fichiers
              <input
                type="file"
                name="documents"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                multiple
                required
              />
              <small>PDF, Word ou images. Cinq fichiers et 5 Mo au total maximum.</small>
            </label>
          </fieldset>
          {upload?.error && (
            <p className="md-form-error" role="alert">
              {upload.error}
            </p>
          )}
          {upload?.success && (
            <p className="md-form-success" role="status">
              {upload.success}
            </p>
          )}
          <div>
            <button className="md-primary" type="submit" disabled={uploading}>
              {uploading ? "Envoi en cours…" : "Envoyer les documents"}
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
