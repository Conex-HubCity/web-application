import Image from "next/image";
import Link from "next/link";
import { Icon } from "./icon";
import { Journey } from "./journey";

const pathways = [
  {
    role: "porteur",
    number: "01",
    image: "entrepreneure.webp",
    label: "PORTEURS DE PROJETS",
    title: (
      <>
        Vous avez l’élan.
        <br />
        Trouvez le regard
        <br />
        qui fait avancer.
      </>
    ),
    text: "Prenez du recul, structurez votre projet et avancez avec l’expérience d’un mentor. Vous restez aux commandes de votre parcours.",
    action: "Créer mon compte porteur",
  },
  {
    role: "mentor",
    number: "02",
    image: "mentor.webp",
    label: "PROFESSIONNELS DE LA DIASPORA",
    title: (
      <>
        Votre expérience
        <br />
        peut ouvrir
        <br />
        d’autres possibles.
      </>
    ),
    text: "Partagez votre regard et vos savoir-faire avec un entrepreneur africain. Un engagement de transmission, à la mesure de vos disponibilités.",
    action: "Devenir mentor",
  },
];

const commitments = [
  {
    icon: "people",
    title: "La confiance avant la rencontre",
    text: "Certification des porteurs, validation des projets et vérification des mentors : chaque étape a son propre contrôle par Conex.",
  },
  {
    icon: "lock",
    title: "Un projet partagé, des pièces protégées",
    text: "Certificats et coordonnées restent privés. Les dossiers confidentiels sont réservés aux mentors vérifiés, adhérents et autorisés.",
  },
  {
    icon: "leaf",
    title: "Une relation choisie, jamais imposée",
    text: "Chacun donne son accord. Le compagnonnage n’impose ni emploi, ni exclusivité, ni investissement ou service personnel au mentor.",
  },
];

const questions = [
  {
    question: "Puis-je créer mon compte avant d’être certifié ?",
    answer:
      "Oui. Vous pouvez créer votre compte et préparer votre profil avant la certification. Votre profil reste privé et non visible dans le catalogue tant que l’équipe Conex n’a pas vérifié votre certificat WoeAcademy Niveau Rouge. Vous pourrez ensuite soumettre votre pitch, qui fera l’objet d’une validation distincte.",
  },
  {
    question: "L’inscription est-elle gratuite ?",
    answer:
      "L’inscription est gratuite pour les porteurs de projets. Les mentors présentent d’abord leur candidature : leur identité et leur expertise sont vérifiées avant le paiement d’une adhésion. Les conditions et la durée de cette adhésion seront précisées avant son ouverture.",
  },
  {
    question: "Comment se forme le binôme avec un mentor ?",
    answer:
      "Un mentor actif manifeste son intérêt pour un projet validé. Conex examine la compatibilité et organise une rencontre introductive. Le mentorat est activé uniquement après la validation de l’équipe et l’accord explicite du porteur de projet et du mentor.",
  },
  {
    question: "Qui peut consulter les documents de mon projet ?",
    answer:
      "Votre certificat, vos coordonnées et les pièces sensibles restent privés. Les documents confidentiels du projet sont accessibles uniquement aux mentors vérifiés, adhérents et autorisés selon la politique d’accès. Une présentation publique éventuelle nécessite votre consentement.",
  },
  {
    question: "Le mentorat garantit-il un financement ?",
    answer:
      "Non. Le compagnonnage aide d’abord à faire mûrir le projet. Les dotations et contributions relèvent d’une phase ultérieure, d’un processus de sélection distinct et des fonds réellement disponibles. Aucun financement ni montant n’est garanti.",
  },
  {
    question: "Conex et WoeAcademy sont-ils la même plateforme ?",
    answer:
      "Non. WoeAcademy assure la formation et la certification. Conex est une plateforme autonome de transmission et de mentorat. Le certificat WoeAcademy Niveau Rouge est le prérequis de validation des profils entrepreneurs ; Conex ne remplace pas le parcours pédagogique.",
  },
  {
    question: "À qui s’adresse le pilote Conex ?",
    answer:
      "Le pilote est réservé aux personnes majeures : porteurs de projets en Afrique et professionnels expérimentés de la diaspora africaine. Les pays de lancement et les modalités d’ouverture seront précisés avant le démarrage du pilote.",
  },
];

export function HomeSections() {
  return (
    <>
      <section
        id="les-parcours"
        className="cnx-pathways cnx-section"
        aria-labelledby="pathways-title"
      >
        <div className="welcome-container">
          <div className="cnx-split-heading">
            <div className="cnx-section-heading">
              <div className="welcome-eyebrow">
                <span /> DEUX PARCOURS, UN MÊME ÉLAN
              </div>
              <h2 id="pathways-title">
                Chacun son chemin.
                <br />
                <em>Un horizon partagé.</em>
              </h2>
            </div>
            <p>
              Une idée à faire grandir. Une expérience à transmettre. Choisissez la place depuis
              laquelle vous souhaitez avancer.
            </p>
          </div>
          <div className="cnx-pathway-grid">
            {pathways.map((pathway) => (
              <Link
                href={`/inscription/${pathway.role}`}
                key={pathway.role}
                className="cnx-pathway-card"
              >
                <Image
                  src={`/assets/conex/${pathway.image}`}
                  alt=""
                  fill
                  sizes="(max-width: 760px) 100vw, 46vw"
                />
                <div className="cnx-photo-shade" />
                <div className="cnx-pathway-top">
                  <span>PARCOURS {pathway.number}</span>
                  <span className="cnx-circle-arrow">
                    <Icon name="diagonal" size={19} />
                  </span>
                </div>
                <div className="cnx-pathway-bottom">
                  <span className="cnx-pathway-label">{pathway.label}</span>
                  <h3>{pathway.title}</h3>
                  <p>{pathway.text}</p>
                  <span className="cnx-pathway-link">
                    {pathway.action}
                    <Icon name="arrow" size={18} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <p className="cnx-pathway-footnote">
            <Icon name="compass" size={18} />
            Vous pouvez créer votre compte avant la certification. La validation du profil et celle
            du projet restent deux étapes distinctes.
          </p>
        </div>
      </section>

      <Journey />

      <section id="la-confiance" className="cnx-trust cnx-section" aria-labelledby="trust-title">
        <div className="welcome-container cnx-trust-grid">
          <div>
            <div className="cnx-section-heading">
              <div className="welcome-eyebrow">
                <span /> UN CADRE QUI PREND SOIN DU LIEN
              </div>
              <h2 id="trust-title">
                La confiance
                <br />
                ne se décrète pas.
                <br />
                <em>Elle se construit.</em>
              </h2>
              <p>
                Un accompagnement a besoin de clarté, de respect et de liberté. C’est le cadre dans
                lequel Conex fait naître les rencontres.
              </p>
            </div>
            <div className="cnx-commitments">
              {commitments.map((item) => (
                <article key={item.title}>
                  <span className="cnx-commitment-icon">
                    <Icon name={item.icon} size={20} />
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
            <a className="cnx-inline-link" href="#questions-frequentes">
              Comprendre le fonctionnement
              <Icon name="arrow" size={18} />
            </a>
          </div>
          <div className="cnx-trust-visual">
            <div className="cnx-trust-photo">
              <Image
                src="/assets/conex/portrait-femme.webp"
                alt="Portrait illustratif d’une professionnelle"
                fill
                sizes="(max-width: 760px) 100vw, 42vw"
              />
            </div>
            <div className="cnx-trust-note">
              <Icon name="people" size={30} />
              <p>
                <strong>Un lien libre.</strong>
                <span>Un cadre partagé pour avancer.</span>
              </p>
            </div>
            <span className="cnx-image-note">Visuel d’illustration</span>
          </div>
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
              <span /> AVANT DE FAIRE LE PREMIER PAS
            </div>
            <h2 id="faq-title">
              Vos questions.
              <br />
              <em>En toute clarté.</em>
            </h2>
            <p>
              Quelques repères pour comprendre votre parcours et rejoindre Conex en connaissance de
              cause.
            </p>
            <Link className="cnx-inline-link" href="/inscription/porteur">
              Commencer mon parcours
              <Icon name="arrow" size={18} />
            </Link>
          </div>
          <div className="cnx-faq-items">
            {questions.map((item, index) => (
              <details key={item.question}>
                <summary>
                  <span className="cnx-faq-number">0{index + 1}</span>
                  <span>{item.question}</span>
                  <span className="cnx-faq-plus" aria-hidden="true">
                    +
                  </span>
                </summary>
                <div className="cnx-faq-answer">
                  <p>{item.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="cnx-final" aria-labelledby="final-title">
        <div className="welcome-container cnx-final-grid">
          <div className="cnx-section-heading">
            <div className="welcome-eyebrow">
              <span /> LA SUITE COMMENCE AVEC VOUS
            </div>
            <h2 id="final-title">
              Les possibles
              <br />
              se construisent
              <br />
              <em>à plusieurs.</em>
            </h2>
            <p>
              Votre projet mérite un regard nouveau. Votre expérience peut ouvrir une voie. Faisons
              le premier pas.
            </p>
            <div className="welcome-hero-actions">
              <Link className="hero-join hero-join-founder" href="/inscription/porteur">
                Je porte un projet
                <span>
                  <Icon name="diagonal" size={18} />
                </span>
              </Link>
              <Link className="hero-join hero-join-mentor" href="/inscription/mentor">
                Devenir mentor
                <Icon name="arrow" size={18} />
              </Link>
            </div>
            <p className="cnx-final-login">
              Déjà membre ?{" "}
              <Link href="/connexion">
                Se connecter
                <Icon name="diagonal" size={14} />
              </Link>
            </p>
          </div>
          <div className="cnx-final-art">
            <div className="cnx-final-photo">
              <Image
                src="/assets/conex/collectif.webp"
                alt="Illustration d’un collectif réuni autour d’un projet"
                fill
                sizes="(max-width: 760px) 85vw, 40vw"
              />
            </div>
            <span className="cnx-final-monogram" aria-hidden="true">
              CNX<span>.</span>
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
