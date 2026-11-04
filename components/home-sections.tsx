import { getTranslator } from "@/lib/i18n/server";
import Image from "next/image";
import { Link } from "@/components/i18n";
import { Icon } from "./icon";
import { HomeProgramme } from "./home-programme";

const questions = [
  {
    question: "Puis-je créer mon compte avant d’être certifié ?",
    answer:
      "Oui. Vous pouvez créer votre compte Mentee et préparer votre projet avant la certification. La formation et la validation du projet sont deux étapes distinctes.",
  },
  {
    question: "L’inscription est-elle gratuite ?",
    answer:
      "La création du compte est gratuite. Après confirmation de l’email, une contribution unique de 30 USD permet de soutenir le fonctionnement de CNX. Vous pouvez ensuite vous arrêter là ou déposer vos justificatifs pour proposer votre candidature mentor.",
  },
  {
    question: "Comment se forme le binôme avec un mentor ?",
    answer:
      "La mise en relation est en cours de développement. À son ouverture, CNX examinera la compatibilité, préparera une rencontre et recueillera l’accord des deux personnes.",
  },
  {
    question: "Qui peut consulter les documents de mon projet ?",
    answer:
      "Votre certificat et les pièces sensibles restent privés. Les mentors autorisés peuvent consulter la présentation de votre projet, distincte de vos justificatifs confidentiels.",
  },
  {
    question: "Le mentorat garantit-il un financement ?",
    answer:
      "Non. Le compagnonnage aide d’abord à faire mûrir le projet. Les dotations et contributions relèvent d’une phase ultérieure, d’un processus de sélection distinct et des fonds réellement disponibles. Aucun financement ni montant n’est garanti.",
  },
  {
    question: "CNX et WoeAcademy sont-ils la même plateforme ?",
    answer:
      "Non. WoeAcademy assure la formation et la certification. CNX est une plateforme autonome de transmission et de mentorat. Le certificat WoeAcademy Niveau Rouge est le prérequis de validation des profils entrepreneurs ; CNX ne remplace pas le parcours pédagogique.",
  },
  {
    question: "À qui s’adresse le pilote CNX ?",
    answer:
      "Le pilote est réservé aux personnes majeures : porteurs de projets en Afrique et professionnels expérimentés de la diaspora africaine. Les pays de lancement et les modalités d’ouverture seront précisés avant le démarrage du pilote.",
  },
];

export async function HomeSections({
  founderRegistrationClosed = false,
}: {
  founderRegistrationClosed?: boolean;
}) {
  const t = await getTranslator();
  function PathwayCard({ role, children }: { role: string; children: React.ReactNode }) {
    return founderRegistrationClosed && role === "porteur" ? (
      <div className="cnx-pathway-card" aria-disabled="true" data-founder-registration="closed">
        {children}
      </div>
    ) : (
      <Link
        href={`/inscription/${role}`}
        className="cnx-pathway-card"
        data-founder-registration={role === "porteur" ? "open" : undefined}
      >
        {children}
      </Link>
    );
  }
  const pathways = [
    {
      role: "porteur",
      number: "01",
      image: "entrepreneure.webp",
      label: t("MENTEES"),
      title: (
        <>
          {" "}
          {t("Vous avez l’élan.")} <br /> {t("Trouvez le regard")} <br />{" "}
          {t("qui fait avancer.")}{" "}
        </>
      ),
      text: t(
        "Prenez du recul, structurez votre projet et avancez avec l’expérience d’un mentor. Vous restez aux commandes de votre parcours.",
      ),
      action: t("Rejoindre comme Mentee"),
    },
    {
      role: "mentor",
      number: "02",
      image: "mentor.webp",
      label: t("PROFESSIONNELS DE LA DIASPORA"),
      title: (
        <>
          {" "}
          {t("Votre expérience")} <br /> {t("peut ouvrir")} <br /> {t("d’autres possibles.")}{" "}
        </>
      ),
      text: t(
        "Partagez votre regard et vos savoir-faire avec un entrepreneur africain. Un engagement de transmission, à la mesure de vos disponibilités.",
      ),
      action: t("Devenir mentor"),
    },
  ];

  return (
    <>
      <section
        id="programme"
        className="cnx-section cnx-training-section"
        aria-labelledby="training-title"
      >
        <div className="welcome-container">
          <div className="cnx-section-heading">
            <div className="welcome-eyebrow">
              <span />
              {t("APPRENDRE POUR AVANCER ENSEMBLE")}
            </div>
            <h2 id="training-title">
              {t("Se former.")}
              <br />
              <em>{t("Puis grandir ensemble.")}</em>
            </h2>
            <p>
              {t(
                "Mentee ou mentor, la formation prépare une relation utile. Un socle commun avant la rencontre, puis un chemin à construire à deux.",
              )}
            </p>
          </div>
          <HomeProgramme />
        </div>
      </section>

      <section
        id="questions-frequentes"
        className="cnx-faq cnx-section"
        aria-labelledby="faq-title"
      >
        <div className="welcome-container cnx-faq-grid">
          <div className="cnx-section-heading cnx-faq-heading">
            <div className="welcome-eyebrow">
              <span /> {t("AVANT DE FAIRE LE PREMIER PAS")}{" "}
            </div>
            <h2 id="faq-title">
              {" "}
              {t("Vos questions.")} <br />
              <em>{t("En toute clarté.")}</em>
            </h2>
            <p>
              {" "}
              {t(
                "Quelques repères pour comprendre votre parcours et rejoindre CNX en connaissance de cause.",
              )}{" "}
            </p>
            <a className="cnx-inline-link" href="#choix">
              {t("Choisir mon parcours")}
              <Icon name="arrow" size={18} />
            </a>
          </div>
          <div className="cnx-faq-items">
            {questions.map((item, index) => (
              <details key={t(item.question)}>
                <summary>
                  <span className="cnx-faq-number">0{index + 1}</span>
                  <span>{t(item.question)}</span>
                  <span className="cnx-faq-plus" aria-hidden="true">
                    +
                  </span>
                </summary>
                <div className="cnx-faq-answer">
                  <p>
                    {t(
                      founderRegistrationClosed && index === 0
                        ? "Les inscriptions Mentee sont actuellement fermées. Les comptes existants et les personnes invitées conservent leur accès."
                        : founderRegistrationClosed && index === 1
                          ? "La création du compte est gratuite. Après confirmation de l’email, une contribution unique de 30 USD permet de soutenir le fonctionnement de CNX. Vous pouvez ensuite vous arrêter là ou déposer vos justificatifs pour proposer votre candidature mentor."
                          : item.answer,
                    )}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="choix" className="cnx-pathways cnx-section" aria-labelledby="pathways-title">
        <div className="welcome-container">
          <div className="cnx-split-heading">
            <div className="cnx-section-heading">
              <div className="welcome-eyebrow">
                <span /> {t("CHOISIR SA PLACE")}{" "}
              </div>
              <h2 id="pathways-title">
                {" "}
                {t("Mentee ou mentor.")} <br />
                <em>{t("Un même horizon.")}</em>
              </h2>
            </div>
            <p>
              {" "}
              {t(
                "Une idée à faire grandir. Une expérience à transmettre. Choisissez la place depuis laquelle vous souhaitez avancer.",
              )}{" "}
            </p>
          </div>
          <div className="cnx-pathway-grid">
            {pathways.map((pathway) => (
              <PathwayCard role={pathway.role} key={pathway.role}>
                <Image
                  src={`/assets/conex/${pathway.image}`}
                  alt=""
                  fill
                  sizes="(max-width: 760px) 100vw, 46vw"
                />
                <div className="cnx-photo-shade" />
                <div className="cnx-pathway-top">
                  <span>
                    {t("PARCOURS")} {pathway.number}
                  </span>
                  <span className="cnx-circle-arrow">
                    <Icon name="diagonal" size={19} />
                  </span>
                </div>
                <div className="cnx-pathway-bottom">
                  <span className="cnx-pathway-label">{pathway.label}</span>
                  <h3>{pathway.title}</h3>
                  <p>{pathway.text}</p>
                  {pathway.role === "mentor" && (
                    <span className="cnx-pathway-contribution">
                      <strong>30 USD</strong>
                      {t("de soutien, en un seul paiement")}
                    </span>
                  )}
                  <span className="cnx-pathway-link">
                    {founderRegistrationClosed && pathway.role === "porteur"
                      ? t("Bientôt disponible")
                      : pathway.action}
                    <Icon name="arrow" size={18} />
                  </span>
                </div>
              </PathwayCard>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
