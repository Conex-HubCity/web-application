"use client";
import { useTranslations } from "@/components/i18n";

import Image from "next/image";
import { Link } from "@/components/i18n";
import { useState } from "react";
import { Icon } from "./icon";

const journeys = {
  porteur: {
    heading: "Votre idée, un cadre pour grandir.",
    image: "entrepreneure.webp",
    caption: "Votre parcours commence là où vous en êtes.",
    action: "Créer mon compte porteur",
    steps: [
      [
        "Créer votre compte",
        "Présentez votre parcours, votre projet et vos besoins. Vous pouvez vous inscrire avant d’être certifié.",
      ],
      [
        "Faire valider votre certification",
        "Déposez votre certificat WoeAcademy Niveau Rouge. L’équipe Connex le vérifie ; votre profil reste privé avant validation.",
      ],
      [
        "Donner forme à votre projet",
        "Une fois votre profil validé, soumettez votre pitch et votre dossier. Leur validation est une étape distincte avant la publication aux mentors.",
      ],
      [
        "Prendre le temps de la rencontre",
        "Un mentor manifeste son intérêt. Connex examine la demande et organise un échange. Le compagnonnage commence avec votre accord à tous les deux.",
      ],
      [
        "Avancer dans la durée",
        "Fixez vos objectifs ensemble, échangez régulièrement et faites le point chaque mois sur les progrès et les prochaines étapes.",
      ],
    ],
  },
  mentor: {
    heading: "Votre expérience, un nouvel horizon.",
    image: "mentor.webp",
    caption: "Transmettre, c’est aussi continuer à grandir.",
    action: "Présenter ma candidature mentor",
    steps: [
      [
        "Présenter votre expérience",
        "Partagez votre parcours professionnel, vos domaines d’expertise, vos motivations et vos disponibilités.",
      ],
      [
        "Rejoindre un cercle de confiance",
        "L’équipe Connex vérifie votre identité et votre expertise. Après validation, la confirmation de votre adhésion active vos accès.",
      ],
      [
        "Découvrir les projets validés",
        "Explorez les projets selon vos secteurs, vos langues et vos disponibilités. Les dossiers confidentiels sont réservés aux mentors autorisés.",
      ],
      [
        "Faire une demande de rencontre",
        "Vous proposez une mise en relation. Connex en examine la compatibilité et organise un échange, puis recueille le consentement de chacun.",
      ],
      [
        "Accompagner avec régularité",
        "Définissez des objectifs communs, partagez votre regard et rédigez les bilans mensuels. L’équipe Connex reste présente en cas de besoin.",
      ],
    ],
  },
};

export function Journey({ mentorPreview = false }: { mentorPreview?: boolean }) {
  const t = useTranslations();
  const [role, setRole] = useState<"porteur" | "mentor">(mentorPreview ? "mentor" : "porteur");
  const journey =
    mentorPreview && role === "mentor"
      ? {
          ...journeys.mentor,
          steps: [
            [
              "Créer votre compte et soutenir Connex",
              "Confirmez votre email, puis contribuez à hauteur de 30 USD en un paiement unique pour soutenir le fonctionnement de Connex.",
            ],
            [
              "Choisir la suite",
              "Vous pouvez simplement soutenir Connex, sans déposer de documents, ou poursuivre une candidature mentor.",
            ],
            [
              "Faire examiner votre candidature",
              "Si vous souhaitez devenir mentor, présentez votre expérience et vos justificatifs. L’équipe Connex examine votre dossier avant de valider votre candidature.",
            ],
            [
              "Être informé de l’ouverture",
              "Une fois votre candidature acceptée, nous vous informerons par email lorsque votre espace mentor sera disponible.",
            ],
          ],
        }
      : journeys[role];

  return (
    <section
      id="comment-ca-marche"
      className="cnx-journey cnx-section"
      aria-labelledby="journey-title"
    >
      <div className="welcome-container">
        <div className="cnx-section-heading">
          <div className="welcome-eyebrow">
            <span /> {t("LE COMPAGNONNAGE, PAS À PAS")}{" "}
          </div>
          <h2 id="journey-title">
            {" "}
            {t("D’abord une rencontre.")} <br />
            <em>{t("Puis un chemin commun.")}</em>
          </h2>
          <p>
            {" "}
            {t(
              "La confiance se construit. Chaque étape prépare une relation libre, réciproque et suivie dans la durée.",
            )}{" "}
          </p>
        </div>
        <div
          className="cnx-journey-switch"
          role="group"
          aria-label={t("Choisir le parcours à découvrir")}
        >
          <button
            type="button"
            aria-pressed={role === "porteur"}
            aria-controls="journey-content"
            onClick={() => setRole("porteur")}
          >
            {" "}
            {t("Je porte un projet")} <span>01</span>
          </button>
          <button
            type="button"
            aria-pressed={role === "mentor"}
            aria-controls="journey-content"
            onClick={() => setRole("mentor")}
          >
            {" "}
            {t("Je deviens mentor")} <span>02</span>
          </button>
        </div>
        <div
          id="journey-content"
          className="cnx-journey-body"
          role="region"
          aria-labelledby="journey-role-title"
        >
          <div className="cnx-journey-photo">
            <Image
              src={`/assets/conex/${journey.image}`}
              alt=""
              fill
              sizes="(max-width: 760px) 100vw, 43vw"
            />
            <div className="cnx-photo-shade" />
            <p>
              <span aria-hidden="true">✳</span>
              {t(journey.caption)}
            </p>
          </div>
          <div className="cnx-journey-content">
            <h3 id="journey-role-title">{t(journey.heading)}</h3>
            <ol className="cnx-journey-steps">
              {journey.steps.map(([title, text], index) => (
                <li key={t(title)}>
                  <span className="cnx-step-number">0{index + 1}</span>
                  <div>
                    <h4>{t(title)}</h4>
                    <p>{t(text)}</p>
                  </div>
                </li>
              ))}
            </ol>
            {mentorPreview && role === "porteur" ? (
              <span className="cnx-inline-link">{t("Bientôt disponible")}</span>
            ) : (
              <Link className="cnx-inline-link" href={`/inscription/${role}`}>
                {t(journey.action)}
                <Icon name="arrow" size={18} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
