import { getTranslator } from "@/lib/i18n/server";
import Image from "next/image";
import { HomeProgramme } from "./home-programme";
import { PathwayAction } from "./pathway-action";

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
  const pathways = [
    {
      role: "porteur",
      number: "01",
      image: "entrepreneure.webp",
      label: t("Mentee"),
      introduction: t("Vous êtes un jeune sur le continent qui désire être guidé dans son projet."),
      title: t("Vous avez l’élan. Trouvez le regard qui vous fait avancer."),
      text: t(
        "Prenez du recul, progressez avec les conseils d’un aîné. Vous restez aux commandes de votre parcours.",
      ),
      detail: null,
    },
    {
      role: "mentor",
      number: "02",
      image: "mentor.webp",
      label: t("Mentor"),
      introduction: t(
        "Vous êtes un professionnel en dehors du continent qui souhaite partager son expérience.",
      ),
      title: t("Votre expérience peut booster un projet."),
      text: t(
        "Transmettez, guidez, faites bénéficier de votre expertise, de votre savoir-faire, de vos compétences, de votre réseau.",
      ),
      detail: t("Un engagement d’accompagnement à la mesure de vos disponibilités."),
    },
  ];

  return (
    <>
      <section id="a-propos" className="cnx-about cnx-section" aria-labelledby="about-title">
        <div className="welcome-container cnx-about-grid">
          <div className="cnx-section-heading cnx-about-copy">
            <div className="welcome-eyebrow">
              <span />
              CNX ?
            </div>
            <h2 id="about-title">
              {t("Un ambitieux programme de mentorat")}{" "}
              <em>{t("au service de la transformation de l’Afrique.")}</em>
            </h2>
            <p className="cnx-about-intro">
              {t("Une bonne connexion peut ouvrir de nouveaux possibles.")}
            </p>
            <p>
              {t(
                "CNX relie des primo-entrepreneurs du continent à des professionnels de la diaspora qui souhaitent partager leur expérience.",
              )}
            </p>
            <p className="cnx-about-signature">{t("JETER UN PONT POUR CONSTRUIRE ENSEMBLE")}</p>
          </div>
          <figure className="cnx-about-visual">
            <Image
              src="/assets/conex/africa-mirror-v1.png"
              alt={t(
                "Une entrepreneure et un mentor se font face autour d’un miroir en forme d’Afrique.",
              )}
              width={1536}
              height={1024}
              sizes="(max-width: 900px) 100vw, 54vw"
            />
          </figure>
        </div>
      </section>
      <section
        id="programme"
        className="cnx-section cnx-training-section"
        aria-labelledby="training-title"
      >
        <div className="welcome-container">
          <div className="cnx-section-heading cnx-training-heading">
            <h2 id="training-title">{t("Formation mentorale & Co")}</h2>
            <p className="cnx-training-subtitle">
              {t("Une véritable préparation au compagnonnage.")}
            </p>
            <p>{t("WoeAcademy et Formation Mentorale : les arches sous le pont.")}</p>
          </div>
          <HomeProgramme />
        </div>
      </section>

      <section id="choix" className="cnx-pathways cnx-section" aria-labelledby="pathways-title">
        <div className="welcome-container">
          <div className="cnx-section-heading cnx-pathways-heading">
            <h2 id="pathways-title">{t("Les parcours")}</h2>
            <p className="cnx-pathways-subtitle">{t("Mentor, Mentee : un même horizon.")}</p>
          </div>
          <div className="cnx-pathway-grid">
            {pathways.map((pathway) => (
              <article
                className="cnx-pathway-card"
                key={pathway.role}
                data-founder-registration={
                  pathway.role === "porteur"
                    ? founderRegistrationClosed
                      ? "closed"
                      : "open"
                    : undefined
                }
              >
                <Image
                  src={`/assets/conex/${pathway.image}`}
                  alt=""
                  fill
                  sizes="(max-width: 760px) 100vw, 46vw"
                />
                <div className="cnx-photo-shade" />
                <div className="cnx-pathway-top">
                  <span className="cnx-pathway-label">{pathway.label}</span>
                </div>
                <div className="cnx-pathway-bottom">
                  <h3>{pathway.title}</h3>
                  <p className="cnx-pathway-intro">{pathway.introduction}</p>
                  <p>{pathway.text}</p>
                  {pathway.detail && <p className="cnx-pathway-detail">{pathway.detail}</p>}
                  {pathway.role === "mentor" && (
                    <span className="cnx-pathway-contribution">
                      <span>{t("En tant que mentor vous soutenez CNX")}</span>
                      <strong>30 USD</strong>
                    </span>
                  )}
                  <PathwayAction role={pathway.role} closed={founderRegistrationClosed} />
                </div>
              </article>
            ))}
          </div>
          <p className="cnx-pathways-connection">{t("Nous vous connectons.")}</p>
        </div>
      </section>

      <section
        id="projet-du-mois"
        className="cnx-section cnx-featured-project"
        aria-labelledby="featured-project-title"
      >
        <div className="welcome-container">
          <div className="cnx-section-heading">
            <h2 id="featured-project-title">{t("Le projet du mois")}</h2>
          </div>
          <article className="cnx-project-banner" aria-labelledby="oria-title">
            <Image
              className="cnx-project-backdrop"
              src="/assets/conex/oria-logo.jpg"
              alt=""
              fill
              sizes="(max-width: 760px) 100vw, 80vw"
            />
            <div className="cnx-project-copy">
              <div className="cnx-project-identity">
                <Image
                  src="/assets/conex/oria-logo.jpg"
                  alt={t("Logo ORIA")}
                  width={64}
                  height={64}
                />
                <h3 id="oria-title">ORIA</h3>
              </div>
              <p className="cnx-project-tagline">{t("Trouver sa voie, construire son avenir.")}</p>
              <p className="cnx-project-description">
                {t(
                  "ORIA accompagne les jeunes dans leurs choix d’études en les aidant à découvrir les formations et établissements adaptés à leurs aspirations.",
                )}
              </p>
            </div>
            <div className="cnx-project-people">
              <figure className="cnx-project-founder">
                <div className="cnx-project-founder-portrait">
                  <Image
                    src="/assets/conex/oria-yao-grace-akogo.jpg"
                    alt={t("Portrait de Yawo Grace Akogo")}
                    fill
                    sizes="(max-width: 600px) 210px, 248px"
                  />
                </div>
                <figcaption>
                  <span>{t("Porteur du projet")}</span>
                  <strong>Yawo Grace Akogo</strong>
                </figcaption>
              </figure>
              <figure className="cnx-project-mentor">
                <div className="cnx-project-mentor-portrait">
                  <Image
                    src="/assets/conex/mentor.webp"
                    alt={t("Portrait illustratif du mentor")}
                    fill
                    sizes="(max-width: 600px) 104px, 124px"
                  />
                </div>
              </figure>
            </div>
          </article>
        </div>
      </section>

      <section
        id="questions-frequentes"
        className="cnx-faq cnx-section"
        aria-labelledby="faq-title"
      >
        <div className="welcome-container cnx-faq-grid">
          <div className="cnx-section-heading cnx-faq-heading">
            <h2 id="faq-title">{t("FAQ")}</h2>
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
                        ? "Les inscriptions Mentee sont actuellement fermées. Les candidatures mentors restent ouvertes."
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
    </>
  );
}
