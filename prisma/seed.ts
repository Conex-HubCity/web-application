import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { seedConnection } from "./seed/identity";
import { seedDemo } from "./seed/index";

async function main() {
  const { connectionString, schema } = seedConnection();
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 5000 }, { schema }),
  });
  try {
    const result = await seedDemo(db, { password: process.env.SEED_PASSWORD });
    console.log(
      `Seed Connex prêt : ${result.projects.length} projets, ${result.projects.length} porteurs, 1 mentor validé et 1 admin fictifs.`,
    );
    console.table([
      { role: "Mentor", email: result.mentor.email },
      { role: "Administration", email: result.admin.email },
      ...result.projects.map((project) => ({ role: project.slug, email: project.founder.email })),
    ]);
    console.log(
      "Mot de passe : SEED_PASSWORD à la première création, sinon la valeur de démonstration documentée dans prisma/seed/README.md.",
    );
    console.log(
      "Catalogue : /fr/mentor/projets ou /en/mentor/projets. Tableau de bord : /fr/compte ou /en/compte.",
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : null;
  // Database driver errors can contain the connection string: never print them verbatim.
  console.error(
    code
      ? `Seed interrompu (${code}). Vérifiez la base cible, ses migrations et ses permissions.`
      : error instanceof Error && error.constructor === Error
        ? error.message
        : "Seed interrompu. Vérifiez les sources et la base cible.",
  );
  process.exitCode = 1;
});
