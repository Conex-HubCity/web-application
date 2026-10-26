import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { isLocale } from "./config";
import { translator } from "./messages";
export async function getLocale() {
  const locale = await lang();
  if (!isLocale(locale)) notFound();
  return locale;
}
export async function getTranslator() {
  return translator(await getLocale());
}
