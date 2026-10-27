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
    title: lang === "en" ? "Connex — Connections that help us grow" : "Connex — Le lien nous élève",
    description:
      lang === "en"
        ? "A space for African entrepreneurs and diaspora professionals to connect and share experience."
        : "L’espace de rencontre et de transmission entre entrepreneurs africains et professionnels de la diaspora.",
    icons: { icon: "/assets/conex/favicon.svg" },
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
