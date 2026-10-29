export const mentorNavigation = [
  { id: "overview", label: "Vue d’ensemble", icon: "home", mobile: "Accueil" },
  { id: "projects", label: "Projets à découvrir", icon: "compass", mobile: "Projets" },
  { id: "requests", label: "Mes demandes", icon: "message", mobile: "Demandes" },
  { id: "mentorships", label: "Mes accompagnements", icon: "people", mobile: "Accompagnements" },
  { id: "profile", label: "Mon profil", icon: "user", mobile: "Profil" },
] as const;
export type MentorView = (typeof mentorNavigation)[number]["id"];
