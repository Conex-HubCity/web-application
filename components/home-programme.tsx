"use client";
import { useId, useRef, useState } from "react";
import { useTranslations } from "@/components/i18n";
import "@/app/home-programme.css";

export function HomeProgramme() {
  const t = useTranslations();
  const id = useId();
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const stages = ["Préalable", "Suivi"] as const;
  return (
    <div id="formation" className="cx-programme">
      <div className="cx-programme-tabs" role="tablist" aria-label={t("Préalable et suivi")}>
        <span
          className="cx-programme-slider"
          style={{ transform: `translateX(${active * 100}%)` }}
          aria-hidden="true"
        />
        {stages.map((stage, index) => (
          <button
            key={stage}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            id={`${id}-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-controls={`${id}-panel-${index}`}
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => {
              let next: number;
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") next = 1 - index;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = 1;
              else return;
              event.preventDefault();
              setActive(next);
              tabs.current[next]?.focus();
            }}
          >
            {t(stage)}
          </button>
        ))}
      </div>
      <div className="cx-programme-panels">
        <section
          className="cx-programme-block"
          id={`${id}-panel-0`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-0`}
          aria-hidden={active !== 0}
          inert={active !== 0}
          tabIndex={active === 0 ? 0 : -1}
        >
          <h3 id={`${id}-academy-title`}>1. WoeAcademy</h3>
          <p className="cx-learning-subtitle">{t("L’université libre de HubCity")}</p>
          <p>
            {t("Vous portez un projet ? Le parcours de formation")} {" "}
            <a
              className="cx-programme-link"
              href="https://woeacademy.hubcity.africa"
              target="_blank"
              rel="noreferrer"
            >
              WoeAcademy
            </a>{" "}
            {t(
              "vous aide à le structurer avant de l’inscrire sur la plateforme et espérer bénéficier d’un mentorat.",
            )}
          </p>
          <p className="cx-learning-note">
            {t("(Le Niveau de certification Rouge est le prérequis pour devenir Mentee sur CNX)")}
          </p>
          <h3 id={`${id}-mentoring-title`}>2. {t("Formation mentorale")}</h3>
          <p className="cx-learning-subtitle">
            {t("Apprendre à transmettre, apprendre à écouter")}
          </p>
          <p>
            {t(
              "Le socle commun : la Formation Mentorale prépare les deux parties pour une relation utile et efficace.",
            )}
          </p>
        </section>
        <section
          className="cx-programme-block"
          id={`${id}-panel-1`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-1`}
          aria-hidden={active !== 1}
          inert={active !== 1}
          tabIndex={active === 1 ? 0 : -1}
        >
          <div className="cx-connection-copy">
            <h4>{t("Connexion & Suivi")}</h4>
            <p className="cx-connection-subtitle">{t("Un engagement libre")}</p>
            <p>{t("L’équipe CNX examine votre parcours et vos justificatifs d’expertise.")}</p>
            <p>
              {t(
                "Après l’examen des profils et du projet, un mentor pourra exprimer son intérêt. CNX vérifiera la compatibilité et préparera une rencontre introductive. Le binôme se formera avec l’accord explicite de chacun.",
              )}
            </p>
            <p>
              {t(
                "Un cadre prévu : des objectifs clairs, des échanges réguliers et un point mensuel. Le binôme trouve son rythme, dans une relation suivie et choisie.",
              )}
            </p>
            <p>{t("La charte HubCity pose un cadre de confiance, sans exclusivité.")}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
