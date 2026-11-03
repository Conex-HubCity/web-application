"use client";

import { useEffect } from "react";

function fragmentTarget() {
  if (window.location.hash.length < 2) return null;
  try {
    return document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  } catch {
    return null;
  }
}

export function FragmentScroll() {
  useEffect(() => {
    let observer: MutationObserver | null = null;

    function scrollToFragment() {
      const target = fragmentTarget();
      if (!target) return false;
      target.scrollIntoView({ block: "start" });
      observer?.disconnect();
      observer = null;
      return true;
    }

    function ensureFragmentScroll() {
      if (scrollToFragment() || observer) return;
      observer = new MutationObserver(scrollToFragment);
      observer.observe(document.body, { childList: true, subtree: true });
    }

    const frame = requestAnimationFrame(ensureFragmentScroll);
    window.addEventListener("hashchange", ensureFragmentScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", ensureFragmentScroll);
      observer?.disconnect();
    };
  }, []);

  return null;
}
