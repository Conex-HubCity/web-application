"use client";
import { useId } from "react";
import { useTranslations } from "@/components/i18n";
import "@/app/home-programme.css";

export function HomeProgramme() {
  const t = useTranslations();
  const id = useId();
  return (
    <div id="formation" className="cx-programme">
      <section className="cx-programme-block" aria-labelledby={`${id}-academy-title`}>
        <h3 id={`${id}-academy-title`}>WoeAcademy</h3>
        <p>
          {t(
            "Vous portez un projet ? Le parcours de formation WoeAcademy vous aide à le structurer avant de l’inscrire sur la plateforme et espérer bénéficier d’un mentorat.",
          )}
        </p>
        <p className="cx-learning-note">
          {t("(Le Niveau de certification Rouge est le prérequis pour devenir Mentee sur CNX)")}
        </p>
      </section>
      <section className="cx-programme-block" aria-labelledby={`${id}-mentoring-title`}>
        <h3 id={`${id}-mentoring-title`}>{t("Formation mentorale")}</h3>
        <p className="cx-learning-subtitle">{t("Apprendre à transmettre, apprendre à écouter")}</p>
        <p>
          {t(
            "Le socle commun : la Formation Mentorale prépare les deux parties pour une relation utile et efficace.",
          )}
        </p>
      </section>
      <section className="cx-programme-block" aria-labelledby={`${id}-connection-title`}>
        <div>
          <h3 id={`${id}-connection-title`}>{t("Connexion & Suivi")}</h3>
          <p className="cx-learning-subtitle">{t("Un engagement libre")}</p>
        </div>
        <div className="cx-connection-copy">
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
  );
}
