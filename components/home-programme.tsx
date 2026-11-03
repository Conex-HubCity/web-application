"use client";
import Image from "next/image";
import { useId, useState } from "react";
import { useTranslations } from "@/components/i18n";
import { Icon } from "@/components/icon";
import "@/app/home-programme.css";

const learning = {
  mentee: [
    [
      "Une formation pour les Mentees",
      "Vous portez un projet ? Le parcours de formation WoeAcademy vous prépare à le structurer et à bénéficier d’un mentorat.",
    ],
    [
      "La certification WoeAcademy",
      "Le Niveau Rouge est le prérequis de formation du parcours mentee.",
    ],
    [
      "Un projet examiné à part",
      "La validation de votre projet reste distincte de votre certification.",
    ],
  ],
  mentor: [
    [
      "Une expérience vérifiée",
      "L’équipe CNX examine votre parcours et vos justificatifs d’expertise.",
    ],
    [
      "Une formation au compagnonnage",
      "Apprendre à transmettre, écouter et poser un cadre d’accompagnement.",
    ],
    ["Un engagement libre", "La charte HubCity pose un cadre de confiance, sans exclusivité."],
  ],
} as const;

export function HomeProgramme({ menteeLabel = "Mentee" }: { menteeLabel?: string }) {
  const t = useTranslations();
  const id = useId();
  const [role, setRole] = useState<"mentee" | "mentor">("mentee");
  const panelId = `${id}-learning`;
  return (
    <ol className="cx-programme-list">
      <li className="cx-programme-item">
        <span className="cx-programme-number" aria-hidden="true">
          01
        </span>
        <article
          id="formation"
          className="cx-chapter cx-chapter-training"
          aria-labelledby={`${id}-formation-title`}
        >
          <div className="cx-chapter-training-copy">
            <div className="cx-chapter-training-symbol" aria-hidden="true">
              <Icon name="book" size={28} />
            </div>
            <h3 id={`${id}-formation-title`}>{t("Se former, avant de se rencontrer.")}</h3>
            <p className="cx-chapter-intro">
              {t(
                "Un socle commun : apprendre à transmettre, à recevoir et à avancer ensemble. La formation concerne les deux rôles.",
              )}
            </p>
            <div
              className="cx-programme-selector"
              role="group"
              aria-label={t("Consulter la formation selon votre rôle")}
            >
              <button
                type="button"
                aria-pressed={role === "mentee"}
                aria-controls={panelId}
                onClick={() => setRole("mentee")}
              >
                {menteeLabel}
              </button>
              <button
                type="button"
                aria-pressed={role === "mentor"}
                aria-controls={panelId}
                onClick={() => setRole("mentor")}
              >
                {t("Mentor")}
              </button>
            </div>
            <div
              id={panelId}
              className="cx-programme-learning"
              aria-live="polite"
              aria-atomic="true"
            >
              <ul>
                {learning[role].map(([title, description]) => (
                  <li key={title}>
                    <Icon name="check" size={16} />
                    <div>
                      <strong>{t(title)}</strong>
                      <p>
                        {t(description)}
                        {role === "mentee" && title === "La certification WoeAcademy" && (
                          <span className="cx-programme-red-badge">{t("Niveau Rouge")}</span>
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <figure className="cx-chapter-training-visual">
            <Image
              src="/assets/conex/collectif.webp"
              alt={t("Un groupe échange et travaille ensemble autour d’un ordinateur.")}
              width={763}
              height={508}
              sizes="(max-width: 760px) 90vw, 40vw"
              loading="lazy"
            />
            <figcaption>
              <span aria-hidden="true" />
              <p>{t("Apprendre avec les autres. Grandir ensemble.")}</p>
            </figcaption>
          </figure>
        </article>
      </li>
      <li className="cx-programme-item">
        <span className="cx-programme-number" aria-hidden="true">
          02
        </span>
        <article className="cx-chapter cx-chapter-meeting" aria-labelledby={`${id}-meeting-title`}>
          <div className="cx-chapter-copy">
            <h3 id={`${id}-meeting-title`}>{t("Se rencontrer.")}</h3>
            <p>
              {t(
                "Après l’examen des profils et du projet, un mentor pourra exprimer son intérêt. CNX vérifiera la compatibilité et préparera une rencontre introductive. Le binôme se formera avec l’accord explicite de chacun.",
              )}
            </p>
            <span className="cx-chapter-future">
              <span aria-hidden="true" />
              {t("Mises en relation en cours de développement")}
            </span>
          </div>
          <Image
            className="cx-chapter-meeting-photo"
            src="/assets/conex/rencontre.webp"
            alt={t("Deux personnes échangent autour d’un projet et d’un ordinateur.")}
            width={765}
            height={506}
            sizes="(max-width: 760px) 90vw, 25vw"
            loading="lazy"
          />
        </article>
      </li>
      <li className="cx-programme-item">
        <span className="cx-programme-number" aria-hidden="true">
          03
        </span>
        <article
          className="cx-chapter cx-chapter-progress"
          aria-labelledby={`${id}-progress-title`}
        >
          <div className="cx-chapter-copy">
            <h3 id={`${id}-progress-title`}>{t("Avancer ensemble.")}</h3>
            <p>
              {t(
                "Le cadre prévu : des objectifs communs, des échanges réguliers et un point mensuel. Chacun avance à son rythme, dans une relation suivie et choisie.",
              )}
            </p>
          </div>
          <div
            className="cx-chapter-rhythm"
            aria-label={t("Le rythme de l’accompagnement à venir")}
          >
            <div>
              <Icon name="compass" size={22} />
              <span>{t("Des objectifs")}</span>
            </div>
            <i aria-hidden="true" />
            <div>
              <Icon name="message" size={22} />
              <span>{t("Des échanges")}</span>
            </div>
            <i aria-hidden="true" />
            <div>
              <Icon name="calendar" size={22} />
              <span>{t("Un point mensuel")}</span>
            </div>
          </div>
        </article>
      </li>
    </ol>
  );
}
