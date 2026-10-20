import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
let db = globalForPrisma.prisma;

/** Lazily create a server-only client; keep one pool across development reloads. */
export function getDb(): PrismaClient {
  if (db) return db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes("CHANGE_ME")) {
    throw new Error("Configurez DATABASE_URL dans .env avant d’utiliser la base de données.");
  }

  const adapter = new PrismaPg({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });

  db = new PrismaClient({ adapter });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
  return db;
}
