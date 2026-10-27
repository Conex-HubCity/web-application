import "dotenv/config";
import pg from "pg";
const index = process.argv.indexOf("--email");
const email = (index >= 0 ? process.argv[index + 1] : "")?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw new Error("Usage: npm run admin:grant -- --email adresse@example.com");
const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
await db.connect();
try {
  await db.query("BEGIN");
  const result = await db.query("SELECT id, account_status FROM users WHERE email=$1 FOR UPDATE", [
    email,
  ]);
  if (result.rows.length !== 1)
    throw new Error("Aucun compte existant ne correspond à cette adresse.");
  if (["SUSPENDED", "CLOSED"].includes(result.rows[0].account_status))
    throw new Error("Ce compte est suspendu ou fermé.");
  await db.query(
    "INSERT INTO user_roles (user_id,role,created_at) VALUES ($1,'ADMIN',NOW()) ON CONFLICT DO NOTHING",
    [result.rows[0].id],
  );
  await db.query("COMMIT");
  console.log("Rôle administrateur attribué au compte demandé. Mot de passe et profil inchangés.");
} catch (error) {
  await db.query("ROLLBACK");
  throw error;
} finally {
  await db.end();
}
