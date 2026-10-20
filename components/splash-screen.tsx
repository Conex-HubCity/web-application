"use client";

import { useEffect, useRef } from "react";

const SESSION_KEY = "conex:introduction-seen:v1";
const REPLAY_EVENT = "conex:replay-introduction";

export function SplashScreen() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dismissRef = useRef<() => void>(() => {});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    let endTimer: ReturnType<typeof setTimeout>;
    let exitTimer: ReturnType<typeof setTimeout>;
    let previousOverflow = "";
    let ownsScrollLock = false;

    function releaseScroll() {
      if (ownsScrollLock) document.body.style.overflow = previousOverflow;
      ownsScrollLock = false;
    }

    function dismiss() {
      clearTimeout(endTimer);
      if (!dialog || !dialog.open || dialog.dataset.leaving === "true") return;
      try { sessionStorage.setItem(SESSION_KEY, "true"); } catch { /* Storage can be disabled. */ }
      dialog.dataset.leaving = "true";
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      exitTimer = setTimeout(() => { dialog.close(); releaseScroll(); }, reducedMotion ? 0 : 500);
    }

    function play() {
      if (!dialog) return;
      clearTimeout(endTimer);
      clearTimeout(exitTimer);
      if (dialog.open) dialog.close();
      releaseScroll();
      dialog.dataset.leaving = "false";
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      ownsScrollLock = true;
      dialog.showModal();
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      endTimer = setTimeout(dismiss, reducedMotion ? 1000 : 4900);
    }

    dismissRef.current = dismiss;
    window.addEventListener(REPLAY_EVENT, play);
    let seen = false;
    try { seen = sessionStorage.getItem(SESSION_KEY) === "true"; } catch { /* Play without storage. */ }
    if (!seen) play();

    return () => {
      clearTimeout(endTimer);
      clearTimeout(exitTimer);
      window.removeEventListener(REPLAY_EVENT, play);
      dialog.close();
      releaseScroll();
    };
  }, []);

  return (
    <dialog ref={dialogRef} className="cnx-splash" aria-label="Présentation de Conex" onCancel={(event) => { event.preventDefault(); dismissRef.current(); }}>
      <div className="splash-orbit splash-orbit-one" aria-hidden="true" />
      <div className="splash-orbit splash-orbit-two" aria-hidden="true" />
      <div className="splash-center">
        <p className="splash-kicker" lang="en">CONNECTIONS THAT HELP US GROW</p>
        <div className="splash-word" role="img" aria-label="CNX">
          <span aria-hidden="true">C</span><span aria-hidden="true">N</span><span aria-hidden="true">X</span><i aria-hidden="true">.</i>
        </div>
        <div className="splash-rule" aria-hidden="true" />
        <p className="splash-tagline">Le lien nous élève.</p>
      </div>
      <div className="splash-signature" lang="en"><span>A solution by</span><strong>HubCity<span>.</span></strong></div>
      <button className="splash-skip" onClick={() => dismissRef.current()}>Passer l’introduction <span aria-hidden="true">↗</span></button>
    </dialog>
  );
}

export function ReplayIntroduction() {
  return <button className="intro-replay" onClick={() => window.dispatchEvent(new Event(REPLAY_EVENT))}>Revoir l’introduction <span aria-hidden="true">↗</span></button>;
}
