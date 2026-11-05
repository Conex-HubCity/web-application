"use client";
import { useTranslations } from "@/components/i18n";

import { useEffect, useRef } from "react";
import Image from "next/image";

const SESSION_KEY = "conex:introduction-seen:v3";
const REPLAY_EVENT = "conex:replay-introduction";

export function SplashScreen() {
  const t = useTranslations();
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
      try {
        sessionStorage.setItem(SESSION_KEY, "true");
      } catch {
        /* Storage can be disabled. */
      }
      dialog.dataset.leaving = "true";
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      exitTimer = setTimeout(
        () => {
          dialog.close();
          releaseScroll();
        },
        reducedMotion ? 0 : 500,
      );
    }

    function play() {
      if (!dialog) return;
      clearTimeout(endTimer);
      clearTimeout(exitTimer);
      if (dialog.open) dialog.close();
      releaseScroll();
      dialog.dataset.leaving = "false";
      // Flush the closed state so replay reliably restarts CSS animations.
      dialog.getBoundingClientRect();
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
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "true";
    } catch {
      /* Play without storage. */
    }
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
    <dialog
      ref={dialogRef}
      className="cnx-splash"
      aria-label={t("Présentation de HubCity")}
      onCancel={(event) => {
        event.preventDefault();
        dismissRef.current();
      }}
    >
      <div className="splash-orbit splash-orbit-one" aria-hidden="true" />
      <div className="splash-orbit splash-orbit-two" aria-hidden="true" />
      <div className="splash-content">
        <div className="splash-center">
          <div className="splash-hubcity">
            <p className="splash-hubcity-attribution" lang="en">
              A solution by
            </p>
            <div className="splash-hubcity-mark">
              <Image
                src="/assets/conex/hubcity-wordmark.png"
                alt="HubCity"
                width={752}
                height={271}
                preload
                unoptimized
              />
            </div>
          </div>
        </div>
      </div>
      <button className="splash-skip" onClick={() => dismissRef.current()}>
        {" "}
        {t("Passer l’introduction")} <span aria-hidden="true">↗</span>
      </button>
    </dialog>
  );
}

export function ReplayIntroduction() {
  const t = useTranslations();
  return (
    <button className="intro-replay" onClick={() => window.dispatchEvent(new Event(REPLAY_EVENT))}>
      {" "}
      {t("Revoir l’introduction")} <span aria-hidden="true">↗</span>
    </button>
  );
}
