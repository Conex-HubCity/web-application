import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Conex — Le lien nous élève",
  description: "L’espace de rencontre et de transmission entre entrepreneurs africains et professionnels de la diaspora.",
  icons: { icon: "/assets/conex/favicon.svg" },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body>{children}</body></html>;
}
