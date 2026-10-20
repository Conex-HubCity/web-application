"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { authenticate } from "@/app/actions/auth";
import { Brand } from "./brand";
import { Icon } from "./icon";

type Role = "porteur" | "mentor";
export function AuthEntry({
  mode,
  initialRole = "porteur",
}: {
  mode: "register" | "login";
  initialRole?: Role;
}) {
  const role = initialRole;
  const [state, action, pending] = useActionState(authenticate.bind(null, mode), null);
  const register = mode === "register";
  const mentor = role === "mentor";
  return (
    <div className="auth-page">
      <header className="welcome-header welcome-container">
        <Brand />
        <Link className="auth-back" href="/">
          Revenir à l’accueil <Icon name="arrow" size={16} />
        </Link>
      </header>
      <main className="auth-main welcome-container">
        <div className="auth-panel">
          <div className="welcome-eyebrow">
            {register ? "LE PREMIER PAS VERS DE NOUVEAUX POSSIBLES" : "HEUREUX DE VOUS RETROUVER"}
          </div>
          <h1>
            {register ? (
              mentor ? (
                <>
                  Votre expérience
                  <br />
                  <em>peut faire la différence.</em>
                </>
              ) : (
                <>
                  Votre projet mérite
                  <br />
                  <em>les bonnes rencontres.</em>
                </>
              )
            ) : (
              <>
                Retrouvons
                <br />
                <em>votre espace.</em>
              </>
            )}
          </h1>
          <p className="auth-lead">
            {register
              ? mentor
                ? "Proposez votre expérience pour accompagner un entrepreneur africain dans la durée."
                : "Créez votre compte pour préparer votre profil et votre parcours d’accompagnement."
              : "Connectez-vous à votre parcours de mentor ou de porteur de projet."}
          </p>
          {register && (
            <div className="auth-role-tabs" aria-label="Mon parcours">
              <Link
                href="/inscription/porteur"
                aria-current={!mentor ? "page" : undefined}
                className={!mentor ? "selected" : ""}
              >
                Je porte un projet
              </Link>
              <Link
                href="/inscription/mentor"
                aria-current={mentor ? "page" : undefined}
                className={mentor ? "selected" : ""}
              >
                Je suis mentor
              </Link>
            </div>
          )}
          <form className="auth-form" action={action}>
            {register && <input type="hidden" name="role" value={mentor ? "MENTOR" : "FOUNDER"} />}
            {register && (
              <label>
                Nom
                <input name="lastName" required autoComplete="family-name" maxLength={100} />
              </label>
            )}
            {register && (
              <label>
                Prénom
                <input name="firstName" required autoComplete="given-name" maxLength={60} />
              </label>
            )}
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder="vous@exemple.com"
              />
            </label>
            <label>
              Mot de passe
              <input
                name="password"
                type="password"
                required
                minLength={register ? 8 : 1}
                maxLength={128}
                autoComplete={register ? "new-password" : "current-password"}
                aria-describedby={register ? "password-hint" : undefined}
              />
            </label>
            {register && (
              <span id="password-hint" className="auth-field-hint">
                8 caractères minimum.
              </span>
            )}
            {register && (
              <label>
                Confirmer le mot de passe
                <input
                  name="passwordConfirmation"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
            )}
            {register && (
              <label className="auth-checkbox">
                <input name="adultConfirmed" type="checkbox" required />
                <span>Je confirme avoir 18 ans ou plus, condition d’accès au pilote Conex.</span>
              </label>
            )}
            {state?.error && (
              <p className="auth-error" role="alert">
                {state.error}
              </p>
            )}
            <button className="auth-submit" type="submit" disabled={pending}>
              {pending ? "Un instant…" : register ? "Créer mon compte" : "Se connecter"}
              <Icon name="arrow" size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Déjà un compte ?" : "Vous découvrez Conex ?"}{" "}
            <Link href={register ? "/connexion" : "/#les-parcours"}>
              {register ? "Se connecter" : "Créer mon compte"}
            </Link>
          </p>
          <Link href="/espace" className="auth-demo-link">
            Explorer l’espace de démonstration <Icon name="diagonal" size={14} />
          </Link>
        </div>
        <aside className="auth-aside">
          <div className="auth-aside-photo">
            <Image
              src={`/assets/conex/${!register ? "rencontre.webp" : mentor ? "mentor.webp" : "jeune-fondatrice.webp"}`}
              alt=""
              fill
              sizes="(max-width: 800px) 0px, 42vw"
            />
            <div />
          </div>
          <div className="auth-aside-content">
            <span className="welcome-eyebrow">
              {!register
                ? "RETROUVER LES LIENS QUI FONT AVANCER"
                : mentor
                  ? "TRANSMETTRE, C’EST AUSSI GRANDIR"
                  : "AVANCER À VOTRE RYTHME"}
            </span>
            <h2>
              {!register ? (
                <>
                  Vos rencontres.
                  <br />
                  <em>Votre espace Conex.</em>
                </>
              ) : mentor ? (
                <>
                  Une expérience.
                  <br />
                  <em>De nouveaux horizons.</em>
                </>
              ) : (
                <>
                  Un premier pas.
                  <br />
                  <em>Un chemin à construire.</em>
                </>
              )}
            </h2>
            <ol>
              {(!register
                ? [
                    "Retrouvez votre parcours et vos prochaines étapes.",
                    "Poursuivez vos échanges et vos rencontres.",
                    "Gardez le fil de vos engagements.",
                  ]
                : mentor
                  ? [
                      "Présentez votre parcours et votre expertise.",
                      "L’équipe Conex vérifie votre candidature.",
                      "Après validation, votre adhésion active vos accès.",
                    ]
                  : [
                      "Créez votre compte, même avant certification.",
                      "Faites vérifier votre certificat WoeAcademy Niveau Rouge.",
                      "Soumettez votre projet à une validation distincte.",
                    ]
              ).map((step, index) => (
                <li key={step}>
                  <span>0{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
            <p>
              {!register
                ? "Un seul accès pour retrouver votre espace et les possibilités ouvertes à votre compte."
                : mentor
                  ? "Chaque mise en relation passe par Conex et nécessite l’accord explicite des deux parties."
                  : "Votre profil reste privé avant validation. Votre certificat et les pièces sensibles restent confidentiels."}
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
