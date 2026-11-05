"use client";

import { useId, useRef } from "react";
import { Link, useTranslations } from "@/components/i18n";
import "@/app/pathway-action.css";

export function PathwayAction({ role, closed = false }: { role: string; closed?: boolean }) {
  const t = useTranslations();
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const label = role === "mentor" ? t("Devenir mentor") : t("Devenir Mentee");

  if (!closed || role === "mentor") {
    return (
      <Link href={`/inscription/${role}`} className="cnx-pathway-action">
        {label}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className="cnx-pathway-action"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        {label}
      </button>
      <dialog
        ref={dialog}
        className="cnx-pathway-notice"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            event.currentTarget.close();
        }}
      >
        <h3 id={`${id}-title`}>{t("Bientôt disponible")}</h3>
        <p id={`${id}-description`}>
          {t(
            "Bientôt vous pourrez créer votre compte, renseigner votre profil Mentee et inscrire votre projet.",
          )}
        </p>
        <form method="dialog">
          <button className="cnx-pathway-action" type="submit">
            {t("Fermer")}
          </button>
        </form>
      </dialog>
    </>
  );
}
