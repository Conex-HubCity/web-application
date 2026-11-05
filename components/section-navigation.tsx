"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/components/i18n";
import "@/app/section-navigation.css";

const sections = [
  { id: "accueil", label: "Accueil" },
  { id: "a-propos", label: "CNX" },
  { id: "programme", label: "Préalable et suivi" },
  { id: "choix", label: "Les parcours" },
  { id: "projet-du-mois", label: "Le projet du mois" },
  { id: "questions-frequentes", label: "FAQ" },
  { id: "pied-de-page", label: "Contact" },
] as const;

export function SectionNavigation() {
  const t = useTranslations();
  const [active, setActive] = useState<string>(sections[0].id);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let current: string = sections[0].id;
      const readingLine = window.innerHeight * 0.4;
      for (const { id } of sections) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= readingLine) current = id;
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        current = sections[sections.length - 1].id;
      }
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Images, fonts and the programme tabs can change section positions.
    const observer = new ResizeObserver(schedule);
    for (const { id } of sections) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <nav className="cnx-section-navigation" aria-label={t("Navigation entre les sections")}>
      {sections.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          aria-label={t(label)}
          aria-current={active === id ? "location" : undefined}
        >
          <span className="cnx-section-dot" aria-hidden="true" />
          <span className="cnx-section-tooltip" aria-hidden="true">
            {t(label)}
          </span>
        </a>
      ))}
    </nav>
  );
}
