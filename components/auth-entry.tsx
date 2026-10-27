"use client";
import { useTranslations } from "@/components/i18n";

import Image from "next/image";
import { Link } from "@/components/i18n";
import { useActionState } from "react";
import { authenticate } from "@/app/actions/auth";
import { Brand } from "./brand";
import { Icon } from "./icon";

type Role = "porteur" | "mentor";
export function AuthEntry({
  mode,
  initialRole = "porteur",
  mentorPreview = false,
}: {
  mode: "register" | "login";
  initialRole?: Role;
  mentorPreview?: boolean;
}) {
  const role = mentorPreview ? "mentor" : initialRole;
  const t = useTranslations();
  const [state, action, pending] = useActionState(authenticate.bind(null, mode), null);
  const register = mode === "register";
  const mentor = role === "mentor";
  return (
    <div className="auth-page">
      <header className="welcome-header welcome-container">
        <Brand />
        <Link className="auth-back" href="/">
          {" "}
          {t("Revenir à l’accueil")} <Icon name="arrow" size={16} />
        </Link>
      </header>
      <main className="auth-main welcome-container">
        <div className="auth-panel">
          <div className="welcome-eyebrow">
            {register
              ? t("LE PREMIER PAS VERS DE NOUVEAUX POSSIBLES")
              : t("HEUREUX DE VOUS RETROUVER")}
          </div>
          <h1>
            {register ? (
              mentor ? (
                <>
                  {" "}
                  {t("Votre expérience")} <br />
                  <em>{t("peut faire la différence.")}</em>
                </>
              ) : (
                <>
                  {" "}
                  {t("Votre projet mérite")} <br />
                  <em>{t("les bonnes rencontres.")}</em>
                </>
              )
            ) : (
              <>
                {" "}
                {t("Retrouvons")} <br />
                <em>{t("votre espace.")}</em>
              </>
            )}
          </h1>
          <p className="auth-lead">
            {register
              ? mentor
                ? t(
                    "Proposez votre expérience pour accompagner un entrepreneur africain dans la durée.",
                  )
                : t(
                    "Créez votre compte pour préparer votre profil et votre parcours d’accompagnement.",
                  )
              : t(
                  mentorPreview
                    ? "Connectez-vous à votre compte mentor."
                    : "Connectez-vous à votre parcours de mentor ou de porteur de projet.",
                )}
          </p>
          {register && !mentorPreview && (
            <div className="auth-role-tabs" aria-label={t("Mon parcours")}>
              <Link
                href="/inscription/porteur"
                aria-current={!mentor ? "page" : undefined}
                className={!mentor ? "selected" : ""}
              >
                {" "}
                {t("Je porte un projet")}{" "}
              </Link>
              <Link
                href="/inscription/mentor"
                aria-current={mentor ? "page" : undefined}
                className={mentor ? "selected" : ""}
              >
                {" "}
                {t("Je suis mentor")}{" "}
              </Link>
            </div>
          )}
          <form className="auth-form" action={action}>
            {register && <input type="hidden" name="role" value={mentor ? "MENTOR" : "FOUNDER"} />}
            {register && (
              <label>
                {" "}
                {t("Nom")}{" "}
                <input name="lastName" required autoComplete="family-name" maxLength={100} />
              </label>
            )}
            {register && (
              <label>
                {" "}
                {t("Prénom")}{" "}
                <input name="firstName" required autoComplete="given-name" maxLength={60} />
              </label>
            )}
            <label>
              {" "}
              {t("Email")}{" "}
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder={t("vous@exemple.com")}
              />
            </label>
            <label>
              {" "}
              {t("Mot de passe")}{" "}
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
                {" "}
                {t("8 caractères minimum.")}{" "}
              </span>
            )}
            {register && (
              <label>
                {" "}
                {t("Confirmer le mot de passe")}{" "}
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
                <span>
                  {t("Je confirme avoir 18 ans ou plus, condition d’accès au pilote Connex.")}
                </span>
              </label>
            )}
            {state?.error && (
              <p className="auth-error" role="alert">
                {t(state.error)}
              </p>
            )}
            <button className="auth-submit" type="submit" disabled={pending}>
              {pending ? t("Un instant…") : register ? t("Créer mon compte") : t("Se connecter")}
              <Icon name="arrow" size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? t("Déjà un compte ?") : t("Vous découvrez Connex ?")}{" "}
            <Link
              href={
                register ? "/connexion" : mentorPreview ? "/inscription/mentor" : "/#les-parcours"
              }
            >
              {register ? t("Se connecter") : t("Créer mon compte")}
            </Link>
          </p>
          {!mentorPreview && (
            <Link href="/espace" className="auth-demo-link">
              {" "}
              {t("Explorer l’espace de démonstration")} <Icon name="diagonal" size={14} />
            </Link>
          )}
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
                ? t("RETROUVER LES LIENS QUI FONT AVANCER")
                : mentor
                  ? t("TRANSMETTRE, C’EST AUSSI GRANDIR")
                  : t("AVANCER À VOTRE RYTHME")}
            </span>
            <h2>
              {!register ? (
                <>
                  {" "}
                  {t("Vos rencontres.")} <br />
                  <em>{t("Votre espace Connex.")}</em>
                </>
              ) : mentor ? (
                <>
                  {" "}
                  {t("Une expérience.")} <br />
                  <em>{t("De nouveaux horizons.")}</em>
                </>
              ) : (
                <>
                  {" "}
                  {t("Un premier pas.")} <br />
                  <em>{t("Un chemin à construire.")}</em>
                </>
              )}
            </h2>
            <ol>
              {(!register
                ? [
                    t("Retrouvez votre parcours et vos prochaines étapes."),
                    t("Poursuivez vos échanges et vos rencontres."),
                    t("Gardez le fil de vos engagements."),
                  ]
                : mentor
                  ? [
                      t("Présentez votre parcours et votre expertise."),
                      t("L’équipe Connex vérifie votre candidature."),
                      t(
                        mentorPreview
                          ? "Après validation, vous serez informé de l’ouverture de votre espace."
                          : "Après validation, votre adhésion active vos accès.",
                      ),
                    ]
                  : [
                      t("Créez votre compte, même avant certification."),
                      t("Faites vérifier votre certificat WoeAcademy Niveau Rouge."),
                      t("Soumettez votre projet à une validation distincte."),
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
                ? t(
                    "Un seul accès pour retrouver votre espace et les possibilités ouvertes à votre compte.",
                  )
                : mentor
                  ? t(
                      "Chaque mise en relation passe par Connex et nécessite l’accord explicite des deux parties.",
                    )
                  : t(
                      "Votre profil reste privé avant validation. Votre certificat et les pièces sensibles restent confidentiels.",
                    )}
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
