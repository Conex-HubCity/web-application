import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";
import { isLocale, localizePath, preferredLocale } from "../lib/i18n/config";
import { translator } from "../lib/i18n/messages";

test("locale links preserve destinations, queries and anchors without duplicating prefixes", () => {
  assert.equal(
    localizePath("/connexion?next=profile#form", "en"),
    "/en/connexion?next=profile#form",
  );
  assert.equal(localizePath("/fr/mentor/candidature", "en"), "/en/mentor/candidature");
  assert.equal(localizePath("/en", "fr"), "/fr");
  assert.equal(localizePath("/", "fr"), "/fr");
  for (const href of [
    "#section",
    "https://example.test/",
    "//example.test/",
    "mailto:test@example.test",
  ])
    assert.equal(localizePath(href, "en"), href);
  assert.equal(isLocale("de"), false);
});

test("saved language takes priority; browser preferences use quality and supported languages", () => {
  assert.equal(preferredLocale("fr", "en-US,en;q=0.9"), "fr");
  assert.equal(preferredLocale("en", "fr"), "en");
  assert.equal(preferredLocale(undefined, "de, en-GB;q=0.8, fr;q=0.7"), "en");
  assert.equal(preferredLocale("invalid", "en;q=0, fr;q=0.5"), "fr");
  assert.equal(preferredLocale(undefined, "en;q=oops, fr;q=0.5"), "fr");
  assert.equal(preferredLocale(undefined, "de"), "fr");
});

test("legacy entry points redirect by locale and retain search parameters", () => {
  const result = proxy(
    new NextRequest("http://localhost/connexion?next=profile", {
      headers: { "accept-language": "en-US" },
    }),
  );
  assert.equal(result.status, 307);
  assert.equal(result.headers.get("location"), "http://localhost/en/connexion?next=profile");
  assert.equal(result.headers.get("cache-control"), "private, no-store");
  const saved = proxy(
    new NextRequest("http://localhost/compte", {
      headers: { cookie: "conex_locale=fr", "accept-language": "en" },
    }),
  );
  assert.equal(saved.headers.get("location"), "http://localhost/fr/compte");
});

test("explicit language persists and unsupported prefixes never redirect in a loop", () => {
  const result = proxy(
    new NextRequest("http://localhost/en/connexion", { headers: { cookie: "conex_locale=fr" } }),
  );
  assert.equal(result.status, 200);
  const cookie = result.cookies.get("conex_locale");
  assert.equal(cookie?.value, "en");
  assert.equal(cookie?.httpOnly, true);
  assert.equal(
    proxy(new NextRequest("http://localhost/de/connexion")).headers.get("location"),
    null,
  );
});

test("English includes authentication errors and the declined mentor application", () => {
  const en = translator("en");
  assert.equal(en("Se connecter"), "Sign in");
  assert.equal(en("Email ou mot de passe incorrect."), "Incorrect email or password.");
  assert.equal(en("a été refusée."), "was declined.");
  assert.equal(en("Soumettre à nouveau mon dossier"), "Resubmit my application");
  assert.equal(translator("fr")("Se connecter"), "Se connecter");
  assert.equal(en("Untranslated content"), "Untranslated content");
});

test("English covers public paths, mentor screens and form confirmations", () => {
  const en = translator("en");
  assert.equal(en("Un lien pour grandir."), "A connection to grow.");
  assert.equal(
    en("Puis-je créer mon compte avant d’être certifié ?"),
    "Can I create an account before being certified?",
  );
  assert.equal(en("Vue d’ensemble"), "Overview");
  assert.equal(en("Mon adhésion"), "My membership");
  assert.equal(en("Modifier mon profil"), "Edit my profile");
  assert.equal(en("Votre profil a été enregistré."), "Your profile has been saved.");
  assert.equal(en("Type de document"), "Document type");
  assert.equal(en("La communauté"), "Community");
});
