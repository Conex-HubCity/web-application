import "server-only";
import { Jimp, JimpMime } from "jimp";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import type { PrismaClient, ProjectImage } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { DomainError } from "@/lib/domain/policies";
import { requireFounderAccount } from "@/lib/domain/founder-access";
import { requireProjectCatalogueMentor } from "@/lib/domain/project-catalogue";

export const MAX_PROJECT_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PROJECT_IMAGE_PIXELS = 25_000_000;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const defaultDirectory = path.join(process.cwd(), "uploads", "private", "projects");
const checksum = (data: Buffer) => createHash("sha256").update(data).digest("hex");
const invalidImage = () =>
  new DomainError("INVALID_PROJECT_IMAGE", "Choisissez une image JPG ou PNG valide.");
export type ProjectImageView = {
  id: string;
  fullUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
};
export function projectImageView(
  image: Pick<ProjectImage, "id" | "fullWidth" | "fullHeight">,
): ProjectImageView {
  return {
    id: image.id,
    fullUrl: `/api/project-images/${image.id}/full`,
    thumbnailUrl: `/api/project-images/${image.id}/thumbnail`,
    width: image.fullWidth,
    height: image.fullHeight,
  };
}
function isAnimated(buffer: Buffer, format: string) {
  if (format === "png") {
    for (let offset = 8; offset + 12 <= buffer.length;) {
      const size = buffer.readUInt32BE(offset);
      if (size > buffer.length - offset - 12) return true;
      const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
      if (type === "acTL") return true;
      offset += size + 12;
    }
  }
  return false;
}
async function prepareImage(file: File) {
  if (!(file instanceof File) || !file.size) throw invalidImage();
  if (file.size > MAX_PROJECT_IMAGE_BYTES)
    throw new DomainError("PROJECT_IMAGE_TOO_LARGE", "L’image ne doit pas dépasser 5 Mo.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const signature =
    buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
      ? "png"
      : buffer.subarray(0, 3).toString("hex") === "ffd8ff"
        ? "jpeg"
        : null;
  if (!signature || isAnimated(buffer, signature)) throw invalidImage();
  try {
    const image = await Jimp.fromBuffer(buffer);
    if (
      !image.bitmap.width ||
      !image.bitmap.height ||
      image.bitmap.width * image.bitmap.height > MAX_PROJECT_IMAGE_PIXELS
    )
      throw invalidImage();
    image.scaleToFit({ w: 1800, h: 1200 });
    const fullData = await image.getBuffer(JimpMime.png);
    const thumbnailImage = new Jimp({ width: 480, height: 320, color: 0xf5f3e9ff });
    const thumbnailContent = image.clone().scaleToFit({ w: 480, h: 320 });
    thumbnailImage.composite(
      thumbnailContent,
      Math.floor((480 - thumbnailContent.bitmap.width) / 2),
      Math.floor((320 - thumbnailContent.bitmap.height) / 2),
    );
    const thumbnailData = await thumbnailImage.getBuffer(JimpMime.png);
    return {
      full: {
        data: fullData,
        info: { width: image.bitmap.width, height: image.bitmap.height },
      },
      thumbnail: {
        data: thumbnailData,
        info: { width: thumbnailImage.bitmap.width, height: thumbnailImage.bitmap.height },
      },
    };
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw invalidImage();
  }
}
export async function uploadProjectImage(
  userId: string,
  file: File,
  db: PrismaClient = getDb(),
  directory = defaultDirectory,
): Promise<ProjectImageView> {
  await requireFounderAccount(userId, db);
  const since = new Date(Date.now() - 60 * 60 * 1000);
  if (
    (await db.projectImage.count({ where: { ownerUserId: userId, createdAt: { gte: since } } })) >=
    20
  )
    throw new DomainError(
      "PROJECT_IMAGE_LIMIT",
      "Vous avez atteint la limite d’images. Réessayez plus tard.",
    );
  const prepared = await prepareImage(file);
  const id = randomUUID();
  const imageDirectory = path.join(/* turbopackIgnore: true */ directory, id);
  const written: string[] = [];
  let committed = false;
  let directoryCreated = false;
  try {
    const image = await db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
        await requireFounderAccount(userId, tx);
        if (
          (await tx.projectImage.count({
            where: { ownerUserId: userId, createdAt: { gte: since } },
          })) >= 20
        )
          throw new DomainError(
            "PROJECT_IMAGE_LIMIT",
            "Vous avez atteint la limite d’images. Réessayez plus tard.",
          );
        await mkdir(imageDirectory, { recursive: true, mode: 0o700 });
        directoryCreated = true;
        for (const [variant, data] of [
          ["full", prepared.full.data],
          ["thumbnail", prepared.thumbnail.data],
        ] as const) {
          const destination = path.join(
            /* turbopackIgnore: true */ imageDirectory,
            `${variant}.png`,
          );
          await writeFile(destination, data, { flag: "wx", mode: 0o600 });
          written.push(destination);
        }
        return tx.projectImage.create({
          data: {
            id,
            ownerUserId: userId,
            fullStorageKey: `projects/${id}/full.png`,
            thumbnailStorageKey: `projects/${id}/thumbnail.png`,
            fullChecksum: checksum(prepared.full.data),
            thumbnailChecksum: checksum(prepared.thumbnail.data),
            fullWidth: prepared.full.info.width,
            fullHeight: prepared.full.info.height,
            fullSizeBytes: prepared.full.data.length,
            thumbnailWidth: prepared.thumbnail.info.width,
            thumbnailHeight: prepared.thumbnail.info.height,
            thumbnailSizeBytes: prepared.thumbnail.data.length,
          },
        });
      },
      { timeout: 15000 },
    );
    committed = true;
    return projectImageView(image);
  } finally {
    if (!committed) {
      await Promise.allSettled(written.map((destination) => unlink(destination)));
      if (directoryCreated) await rmdir(imageDirectory).catch(() => undefined);
    }
  }
}
export async function readProjectImage(
  userId: string,
  imageId: string,
  variant: string,
  db: PrismaClient = getDb(),
  directory = defaultDirectory,
): Promise<{ buffer: Buffer; width: number; height: number; contentType: string } | null> {
  if (!uuid.test(imageId) || !["full", "thumbnail"].includes(variant)) return null;
  const image = await db.projectImage.findUnique({ where: { id: imageId } });
  if (!image) return null;
  if (image.ownerUserId === userId) {
    try {
      await requireFounderAccount(userId, db);
    } catch {
      return null;
    }
  } else {
    try {
      await requireProjectCatalogueMentor(userId, db);
    } catch {
      return null;
    }
    const project = await db.project.findFirst({
      where: {
        founderUserId: image.ownerUserId,
        founder: {
          adultConfirmedAt: { not: null },
          user: {
            accountStatus: "ACTIVE",
            emailVerifiedAt: { not: null },
            roles: { some: { role: "FOUNDER" } },
          },
        },
        currentRevision: {
          is: {
            brandingImageId: image.id,
            presentedAt: { not: null },
            pitchUrl: { not: null },
            archivedAt: null,
            reviewStatus: { notIn: ["REJECTED", "REVOKED"] },
          },
        },
      },
      select: { id: true },
    });
    if (!project) return null;
  }
  const full = variant === "full";
  const storageKey = full ? image.fullStorageKey : image.thumbnailStorageKey;
  const expectedPrefix = `projects/${image.id}/${variant}.`;
  if (!storageKey.startsWith(expectedPrefix)) return null;
  const extension = storageKey.slice(expectedPrefix.length);
  if (!["png", "webp"].includes(extension)) return null;
  try {
    const buffer = await readFile(
      path.join(/* turbopackIgnore: true */ directory, image.id, `${variant}.${extension}`),
    );
    if (
      buffer.length !== (full ? image.fullSizeBytes : image.thumbnailSizeBytes) ||
      checksum(buffer) !== (full ? image.fullChecksum : image.thumbnailChecksum)
    )
      return null;
    return {
      buffer,
      width: full ? image.fullWidth : image.thumbnailWidth,
      height: full ? image.fullHeight : image.thumbnailHeight,
      contentType: extension === "png" ? "image/png" : "image/webp",
    };
  } catch {
    return null;
  }
}
