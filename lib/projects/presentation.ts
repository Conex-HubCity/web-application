import "server-only";
import { DomainError, requiredText } from "@/lib/domain/policies";
export type PresentationLink = { label: string; url: string };
export function presentationUrl(value: string, label: string, required = false) {
  const clean = value.trim();
  if (!clean && !required) return null;
  if (!clean)
    throw new DomainError(
      "INVALID_INPUT",
      label === "pitch" ? "Le lien du pitch est obligatoire." : "Renseignez un lien valide.",
    );
  let url: URL;
  try {
    url = new URL(clean);
  } catch {
    throw new DomainError(
      "INVALID_INPUT",
      "Utilisez un lien complet commençant par https:// ou http://.",
    );
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.toString().length > 2048
  )
    throw new DomainError(
      "INVALID_INPUT",
      "Utilisez un lien complet commençant par https:// ou http://.",
    );
  return url.toString();
}
export function parseProjectPresentation(form: FormData) {
  function text(name: string) {
    const value = form.get(name);
    if (value !== null && typeof value !== "string")
      throw new DomainError("INVALID_INPUT", "Les champs du projet doivent être du texte.");
    return (value ?? "").trim();
  }
  const title = requiredText(text("title"), "Le titre");
  const summary = requiredText(text("summary"), "La présentation");
  const sector = text("sector");
  const stage = text("stage");
  const supportNeeds = form.getAll("supportNeeds");
  if (title.length > 200 || summary.length > 6000 || sector.length > 150 || stage.length > 100)
    throw new DomainError("INVALID_INPUT", "La présentation du projet est trop longue.");
  if (
    supportNeeds.length > 10 ||
    !supportNeeds.every((value) => typeof value === "string" && value.trim() && value.length <= 200)
  )
    throw new DomainError("INVALID_INPUT", "Choisissez jusqu’à dix besoins d’accompagnement.");
  const pitchUrl = presentationUrl(text("pitchUrl"), "pitch", true)!;
  const socialLinks: PresentationLink[] = [];
  for (const [name, label] of [
    ["linkedinUrl", "LinkedIn"],
    ["facebookUrl", "Facebook"],
    ["instagramUrl", "Instagram"],
  ]) {
    const url = presentationUrl(text(name), label);
    if (url) socialLinks.push({ label, url });
  }
  const labels = form.getAll("linkLabel"),
    urls = form.getAll("linkUrl");
  if (labels.length !== urls.length || labels.length > 8)
    throw new DomainError("INVALID_INPUT", "Ajoutez au maximum huit liens personnalisés.");
  const customLinks: PresentationLink[] = [];
  for (let i = 0; i < labels.length; i++) {
    if (typeof labels[i] !== "string" || typeof urls[i] !== "string")
      throw new DomainError("INVALID_INPUT", "Renseignez le nom et l’adresse de chaque lien.");
    const label = (labels[i] as string).trim(),
      raw = (urls[i] as string).trim();
    if (!label && !raw) continue;
    if (!label || label.length > 60 || !raw)
      throw new DomainError("INVALID_INPUT", "Renseignez le nom et l’adresse de chaque lien.");
    customLinks.push({ label, url: presentationUrl(raw, label, true)! });
  }
  const brandingImageId = text("brandingImageId") || null;
  if (brandingImageId && !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(brandingImageId))
    throw new DomainError("INVALID_INPUT", "Choisissez une image valide.");
  return {
    title,
    summary,
    sector: sector || null,
    stage: stage || null,
    supportNeeds: Array.from(new Set((supportNeeds as string[]).map((value) => value.trim()))),
    pitchUrl,
    socialLinks,
    customLinks,
    brandingImageId,
  };
}
export function readPresentationLinks(value: unknown): PresentationLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.label !== "string" ||
      typeof item.url !== "string"
    )
      return [];
    try {
      const url = presentationUrl(item.url, item.label, true);
      return url ? [{ label: item.label, url }] : [];
    } catch {
      return [];
    }
  });
}
