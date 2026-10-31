import { createHash } from "node:crypto";

/** Stable UUIDs keep this dataset separate from accounts created through the app. */
export function seedId(key: string) {
  const hex = createHash("sha256").update(`connex-demo-v1:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export const seedAccounts = {
  admin: { id: seedId("admin"), email: "admin@demo.connex.test" },
  mentor: { id: seedId("mentor"), email: "mentor@demo.connex.test" },
};

export const DEFAULT_SEED_PASSWORD = "Connex-Demo-2026!";

export function founderAccount(slug: string) {
  return { id: seedId(`founder:${slug}`), email: `${slug}@demo.connex.test` };
}

/** Production-named test deployments require an explicit, persistent opt-in. */
export function seedConnection(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const allowProduction = env.SEED_ALLOW_PRODUCTION === "true";
  if (env.STRIPE_MODE === "live")
    throw new Error("Ce seed nécessite Stripe en mode test, même avec SEED_ALLOW_PRODUCTION.");
  if (env.NODE_ENV === "production" && !allowProduction)
    throw new Error("Définissez SEED_ALLOW_PRODUCTION=true pour autoriser explicitement ce seed.");
  const connectionString = env.SEED_DATABASE_URL;
  if (!connectionString || connectionString.includes("CHANGE_ME"))
    throw new Error("Renseignez SEED_DATABASE_URL avec une base de démonstration migrée.");
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("SEED_DATABASE_URL doit être une URL PostgreSQL valide.");
  }
  if (!["postgresql:", "postgres:"].includes(url.protocol) || !url.pathname.slice(1))
    throw new Error("SEED_DATABASE_URL doit désigner une base PostgreSQL valide.");
  if (/prod/i.test(decodeURIComponent(url.pathname)) && !allowProduction)
    throw new Error("Définissez SEED_ALLOW_PRODUCTION=true pour autoriser cette base de test.");
  const schema = url.searchParams.get("schema") || "public";
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema))
    throw new Error("Le nom du schéma de démonstration est invalide.");
  return { connectionString, schema };
}
