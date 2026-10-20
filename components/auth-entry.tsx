"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Brand } from "./brand";
import { Icon } from "./icon";

type Role = "porteur" | "mentor";
export function AuthEntry({ mode, initialRole = "porteur" }: { mode: "register" | "login"; initialRole?: Role }) {
  const [role, setRole] = useState<Role>(initialRole);
  const [submitted, setSubmitted] = useState(false);
  const register = mode === "register";
  const mentor = role === "mentor";
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.currentTarget.reset();
    setSubmitted(true);
  }
  return (
    <div className="auth-page">
      <header className="welcome-header welcome-container"><Brand /><Link className="auth-back" href="/">Revenir à l’accueil <Icon name="arrow" size={16} /></Link></header>
      <main className="auth-main welcome-container">
        <div className="auth-panel">
          <div className="welcome-eyebrow">{register ? "LE PREMIER PAS VERS DE NOUVEAUX POSSIBLES" : "HEUREUX DE VOUS RETROUVER"}</div>
          <h1>{register ? mentor ? <>Votre expérience<br /><em>peut faire la différence.</em></> : <>Votre projet mérite<br /><em>les bonnes rencontres.</em></> : <>Retrouvons<br /><em>votre espace.</em></>}</h1>
          <p className="auth-lead">{register ? mentor ? "Proposez votre expérience pour accompagner un entrepreneur africain dans la durée." : "Créez votre compte pour préparer votre profil et votre parcours d’accompagnement." : "Connectez-vous à votre parcours de mentor ou de porteur de projet."}</p>
          <div className="auth-role-tabs" aria-label="Mon parcours">
            {register ? <><Link href="/inscription/porteur" aria-current={!mentor ? "page" : undefined} className={!mentor ? "selected" : ""}>Je porte un projet</Link><Link href="/inscription/mentor" aria-current={mentor ? "page" : undefined} className={mentor ? "selected" : ""}>Je suis mentor</Link></> : <><button className={!mentor ? "selected" : ""} aria-pressed={!mentor} onClick={() => { setRole("porteur"); setSubmitted(false); }}>Je porte un projet</button><button className={mentor ? "selected" : ""} aria-pressed={mentor} onClick={() => { setRole("mentor"); setSubmitted(false); }}>Je suis mentor</button></>}
          </div>
          <div className="auth-preview-note"><strong>Aperçu du parcours.</strong> Les comptes réels ne sont pas encore activés. Aucun identifiant n’est envoyé ni conservé.</div>
          <form className="auth-form" onSubmit={submit}>
            {register && <label>Votre prénom<input name="firstName" required autoComplete="given-name" maxLength={60} /></label>}
            <label>Adresse email<input name="email" type="email" required autoComplete="email" placeholder="vous@exemple.com" /></label>
            <label>Mot de passe<input name="password" type="password" required minLength={8} autoComplete={register ? "new-password" : "current-password"} aria-describedby="password-hint" /></label>
            <span id="password-hint" className="auth-field-hint">{register ? "8 caractères minimum pour cet aperçu." : "Utilisez uniquement des identifiants fictifs dans cet aperçu."}</span>
            {register && <label className="auth-checkbox"><input type="checkbox" required /><span>Je confirme avoir 18 ans ou plus, condition d’accès au pilote Conex.</span></label>}
            <button className="auth-submit" type="submit">{register ? "Créer mon compte" : "Se connecter"}<Icon name="arrow" size={18} /></button>
          </form>
          {submitted && <div className="auth-feedback" role="status"><strong>{register ? "Le parcours d’inscription est prêt à être connecté." : "La connexion réelle sera disponible à la prochaine étape."}</strong><p>Aucun compte ni aucune session authentifiée n’a été créé. Vous pouvez explorer l’interface de démonstration.</p><Link href="/espace">Explorer l’espace de démonstration <Icon name="arrow" size={16} /></Link></div>}
          <p className="auth-switch">{register ? "Déjà un compte ?" : "Vous découvrez Conex ?"} <Link href={register ? "/connexion" : `/inscription/${role}`}>{register ? "Se connecter" : "Créer mon compte"}</Link></p>
          <Link href="/espace" className="auth-demo-link">Explorer l’espace de démonstration <Icon name="diagonal" size={14} /></Link>
        </div>
        <aside className="auth-aside"><div className="auth-aside-photo"><Image src={`/assets/conex/${mentor ? "mentor.webp" : "jeune-fondatrice.webp"}`} alt="" fill sizes="(max-width: 800px) 0px, 42vw" /><div /></div><div className="auth-aside-content"><span className="welcome-eyebrow">{mentor ? "TRANSMETTRE, C’EST AUSSI GRANDIR" : "AVANCER À VOTRE RYTHME"}</span><h2>{mentor ? <>Une expérience.<br /><em>De nouveaux horizons.</em></> : <>Un premier pas.<br /><em>Un chemin à construire.</em></>}</h2><ol>{(mentor ? ["Présentez votre parcours et votre expertise.", "L’équipe Conex vérifie votre candidature.", "Après validation, votre adhésion active vos accès."] : ["Créez votre compte, même avant certification.", "Faites vérifier votre certificat WoeAcademy Niveau Rouge.", "Soumettez votre projet à une validation distincte."]).map((step, index) => <li key={step}><span>0{index + 1}</span>{step}</li>)}</ol><p>{mentor ? "Chaque mise en relation passe par Conex et nécessite l’accord explicite des deux parties." : "Votre profil reste privé avant validation. Votre certificat et les pièces sensibles restent confidentiels."}</p></div></aside>
      </main>
    </div>
  );
}
