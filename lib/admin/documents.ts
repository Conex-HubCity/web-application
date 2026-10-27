import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { createAdminService } from "./service";
import { requireCondition } from "@/lib/domain/policies";
export async function readAdminDocument(
  actorId: string,
  id: string,
  db: PrismaClient = getDb(),
  directory = path.join(process.cwd(), "uploads", "private", "mentors"),
) {
  const document = await createAdminService(db).getDocument(actorId, id);
  requireCondition(
    /^mentors\/[a-f0-9-]{36}$/.test(document.privateStorageKey),
    "NOT_FOUND",
    "Document indisponible.",
  );
  const filename = path.basename(document.privateStorageKey);
  const buffer = await readFile(path.join(/* turbopackIgnore: true */ directory, filename));
  requireCondition(
    createHash("sha256").update(buffer).digest("hex") === document.checksum,
    "NOT_FOUND",
    "Document indisponible.",
  );
  return { buffer, name: document.originalFilename };
}
