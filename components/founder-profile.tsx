"use client";
import { useActionState, useState } from "react";
import { useTranslations } from "@/components/i18n";
import { ProfilePhotoPicker } from "@/components/profile-photo-picker";
import { updateFounderProfile, type FounderProfileState } from "@/app/actions/founder-profile";
import type { FounderDashboardData } from "@/lib/domain/founder-dashboard";

export function FounderProfile({ data }: { data: FounderDashboardData }) {
  const t = useTranslations();
  const [photo, setPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: FounderProfileState, form: FormData) => {
      if (photo) form.set("profilePhoto", photo);
      form.set("removeProfilePhoto", String(removePhoto));
      const result = await updateFounderProfile(previous, form);
      if (result?.success) {
        setPhoto(null);
        setRemovePhoto(false);
      }
      return result;
    },
    null,
  );
  return (
    <form action={action} className="fd-form fd-profile-form">
      <section className="fd-card fd-form-section">
        <fieldset disabled={pending}>
          <ProfilePhotoPicker
            key={data.profilePhotoUrl ?? "no-photo"}
            initialUrl={data.profilePhotoUrl}
            disabled={pending}
            onRemove={() => setRemovePhoto(true)}
            onChange={(file) => {
              setPhoto(file);
              if (file) setRemovePhoto(false);
            }}
          />
          <div className="fd-form-row">
            <label>
              {t("Prénom")}
              <input
                name="firstName"
                autoComplete="given-name"
                defaultValue={data.firstName}
                maxLength={100}
                required
              />
            </label>
            <label>
              {t("Nom")}
              <input
                name="lastName"
                autoComplete="family-name"
                defaultValue={data.lastName ?? ""}
                maxLength={100}
                required
              />
            </label>
          </div>
          <div className="fd-form-row">
            <label>
              {t("Email")}
              <input type="email" autoComplete="email" value={data.email ?? ""} readOnly />
            </label>
            <label>
              {t("Téléphone")}
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={data.phone ?? ""}
                maxLength={32}
              />
            </label>
          </div>
          <div className="fd-form-row">
            <label>
              {t("Ville")}
              <input
                name="city"
                autoComplete="address-level2"
                defaultValue={data.profile.city ?? ""}
                maxLength={150}
              />
            </label>
            <label>
              {t("Code pays")}
              <input
                name="countryCode"
                autoComplete="country"
                placeholder="TG"
                defaultValue={data.profile.countryCode ?? ""}
                maxLength={2}
                pattern="[A-Za-z]{2}"
              />
            </label>
          </div>
          <label>
            {t("Présentation")}
            <textarea
              name="biography"
              defaultValue={data.profile.biography ?? ""}
              rows={4}
              maxLength={4000}
            />
          </label>
        </fieldset>
      </section>
      <div className="fd-form-footer">
        <div>
          {state?.error && (
            <p className="fd-error" role="alert">
              {t(state.error)}
            </p>
          )}
          {state?.success && (
            <p className="fd-success" role="status">
              {t(state.success)}
            </p>
          )}
        </div>
        <button className="fd-primary" disabled={pending}>
          {t(pending ? "Enregistrement…" : "Enregistrer")}
        </button>
      </div>
    </form>
  );
}
