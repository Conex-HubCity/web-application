import "dotenv/config";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString || connectionString.includes("CHANGE_ME")) {
  console.error("Renseignez DATABASE_URL avec vos identifiants PostgreSQL dans .env.");
  process.exitCode = 1;
} else {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });

  try {
    await client.connect();
    await client.query("SELECT 1");
    console.log("Connexion PostgreSQL vérifiée.");
  } catch (error) {
    // Do not print the connection URL or database credentials.
    const code = error && typeof error === "object" && "code" in error ? error.code : "inconnu";
    console.error(`Connexion PostgreSQL impossible (code : ${code}). Vérifiez .env et le serveur.`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
