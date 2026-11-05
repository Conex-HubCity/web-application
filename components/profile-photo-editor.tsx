"use client";
import { useActionState, useState } from "react";
import { ProfilePhotoPicker } from "@/components/profile-photo-picker";
import { updateProfilePhoto } from "@/app/actions/profile-photo";
import { useTranslations } from "@/components/i18n";
export function ProfilePhotoEditor({ url }: { url: string | null }) {
  const t = useTranslations();
  const [file, setFile] = useState<File | null>(null);
  const [state, action, pending] = useActionState(
    async (previous: { error?: string; success?: boolean } | null, form: FormData) => {
      if (file) form.set("profilePhoto", file);
      return updateProfilePhoto(previous, form);
    },
    null,
  );
  return (
    <form action={action}>
      <ProfilePhotoPicker initialUrl={url} onChange={setFile} disabled={pending} required />
      {state?.error && (
        <p className="auth-error" role="alert">
          {t(state.error)}
        </p>
      )}
      {state?.success && <p role="status">{t("Photo de profil enregistrée.")}</p>}
      <button className="md-outline profile-photo-save" disabled={pending || !file}>
        {t(pending ? "Un instant…" : "Enregistrer la photo")}
      </button>
    </form>
  );
}
