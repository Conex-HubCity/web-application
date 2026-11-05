import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/lib/i18n/config";
import { I18nProvider } from "@/components/i18n";
import "@/app/globals.css";
import "@/app/welcome.css";
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === "en" ? "CNX — Connections that help us grow" : "CNX — Le lien nous élève",
    description:
      lang === "en"
        ? "A space for African entrepreneurs and diaspora professionals to connect and share experience."
        : "L’espace de rencontre et de transmission entre entrepreneurs africains et professionnels de la diaspora.",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/assets/conex/cnx-icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/assets/conex/cnx-icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      shortcut: "/assets/conex/cnx-icon-192.png",
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}
export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html lang={lang}>
      <body>
        <I18nProvider locale={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
