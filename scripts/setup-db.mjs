import "dotenv/config";
import { parse } from "dotenv";
import pg from "pg";
import { readFile, writeFile } from "node:fs/promises";

const connectionString = process.env.DATABASE_URL;
if (!connectionString || connectionString.includes("CHANGE_ME")) {
  throw new Error("Renseignez DATABASE_URL dans .env avant de préparer la base.");
}
const url = new URL(connectionString);
if (decodeURIComponent(url.pathname.slice(1)) !== "postgres") {
  console.log("Une base dédiée est déjà configurée ; aucune modification.");
} else {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("La préparation automatique est réservée au PostgreSQL local.");
  }
  const envPath = new URL("../.env", import.meta.url);
  const contents = await readFile(envPath, "utf8");
  if (parse(contents).DATABASE_URL !== connectionString) {
    throw new Error(
      "DATABASE_URL est définie hors de .env ; configurez explicitement la base dédiée.",
    );
  }
  const admin = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
  await admin.connect();
  try {
    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", ["conex"]);
    if (!exists.rowCount) await admin.query('CREATE DATABASE "conex"');
  } finally {
    await admin.end();
  }
  url.pathname = "/conex";
  const dedicatedUrl = url.toString().replaceAll("$", "%24");
  const dedicated = new pg.Client({
    connectionString: dedicatedUrl,
    connectionTimeoutMillis: 5000,
  });
  await dedicated.connect();
  try {
    const tables = await dedicated.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
    );
    if (tables.rowCount) {
      const migrationTable = tables.rows.some((row) => row.table_name === "_prisma_migrations");
      if (!migrationTable)
        throw new Error(
          "La base conex contient déjà des tables sans historique Connex ; aucune réinitialisation effectuée.",
        );
      const ownMigration = await dedicated.query(
        "SELECT 1 FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL",
        ["20261020000100_initial_v1"],
      );
      if (!ownMigration.rowCount)
        throw new Error(
          "La base conex n’est pas identifiée comme une base Connex existante ; aucune réinitialisation effectuée.",
        );
    }
  } finally {
    await dedicated.end();
  }
  const updated = contents.replace(
    /^DATABASE_URL=.*$/m,
    `DATABASE_URL=${JSON.stringify(dedicatedUrl)}`,
  );
  if (updated === contents) throw new Error("Impossible de mettre à jour DATABASE_URL dans .env.");
  await writeFile(envPath, updated, "utf8");
  console.log(
    "Base locale conex préparée ; DATABASE_URL mise à jour sans afficher les identifiants.",
  );
}
