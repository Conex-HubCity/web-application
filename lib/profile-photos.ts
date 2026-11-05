import "server-only";
import { Jimp, JimpMime } from "jimp";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@/generated/prisma/client";

const root = path.join(process.cwd(), "uploads", "private", "profile-photos");
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export class ProfilePhotoError extends Error {}
const invalid = () => new ProfilePhotoError("Choisissez une photo JPG ou PNG valide.");

function dimensions(bytes: Buffer): [number, number] {
  if (bytes.length >= 24 && bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") {
    // Animated PNGs are not profile photos.
    for (let p = 8; p + 12 <= bytes.length;) {
      const n = bytes.readUInt32BE(p);
      if (n > bytes.length - p - 12) throw invalid();
      if (bytes.subarray(p + 4, p + 8).toString() === "acTL") throw invalid();
      p += n + 12;
    }
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  }
  if (bytes.subarray(0, 3).toString("hex") === "ffd8ff") {
    for (let p = 2; p + 4 < bytes.length;) {
      if (bytes[p++] !== 255) throw invalid();
      while (bytes[p] === 255) p++;
      const marker = bytes[p++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const n = bytes.readUInt16BE(p);
      if (n < 2 || p + n > bytes.length) throw invalid();
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        )
      ) {
        if (n < 7) throw invalid();
        return [bytes.readUInt16BE(p + 5), bytes.readUInt16BE(p + 3)];
      }
      p += n;
    }
  }
  throw invalid();
}

export async function storeProfilePhoto(file: unknown, directory = root) {
  if (!(file instanceof File) || !file.size)
    throw new ProfilePhotoError("Ajoutez votre photo de profil.");
  if (file.size > 5 * 1024 * 1024)
    throw new ProfilePhotoError("La photo ne doit pas dépasser 5 Mo.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const [width, height] = dimensions(bytes);
  if (!width || !height || width * height > 25_000_000) throw invalid();
  let full: Buffer, thumbnail: Buffer;
  try {
    const image = await Jimp.fromBuffer(bytes);
    image.scaleToFit({ w: 512, h: 512 });
    full = await image.getBuffer(JimpMime.jpeg, { quality: 85 });
    thumbnail = await image
      .scaleToFit({ w: 128, h: 128 })
      .getBuffer(JimpMime.jpeg, { quality: 85 });
  } catch {
    throw invalid();
  }
  const id = randomUUID();
  const folder = path.join(directory, id);
  try {
    await mkdir(folder, { recursive: true, mode: 0o700 });
    await writeFile(path.join(folder, "full.jpg"), full, { flag: "wx", mode: 0o600 });
    await writeFile(path.join(folder, "thumbnail.jpg"), thumbnail, { flag: "wx", mode: 0o600 });
    return id;
  } catch (error) {
    await removeProfilePhoto(id, directory);
    throw error;
  }
}
export async function removeProfilePhoto(id: string, directory = root) {
  if (!uuid.test(id)) return;
  const folder = path.resolve(directory, id);
  if (path.dirname(folder) !== path.resolve(directory)) return;
  await rm(folder, { recursive: true, force: true });
}
export function profilePhotoUrl(id: string | null | undefined, variant = "thumbnail") {
  return id ? `/api/profile-photos/${id}/${variant}` : null;
}
export async function readProfilePhoto(
  db: PrismaClient,
  userId: string,
  id: string,
  variant: string,
  directory = root,
) {
  if (!uuid.test(id) || !["full", "thumbnail"].includes(variant)) return null;
  const owner = await db.user.findFirst({
    where: { id: userId, profilePhotoId: id, accountStatus: { notIn: ["SUSPENDED", "CLOSED"] } },
    select: { id: true },
  });
  if (!owner) return null;
  try {
    return await readFile(path.join(directory, id, `${variant}.jpg`));
  } catch {
    return null;
  }
}
export async function replaceMentorPhoto(
  db: PrismaClient,
  userId: string,
  file: unknown,
  directory = root,
) {
  const user = await db.user.findFirst({
    where: {
      id: userId,
      emailVerifiedAt: { not: null },
      accountStatus: "ACTIVE",
      roles: { some: { role: "MENTOR" } },
    },
    select: { profilePhotoId: true },
  });
  if (!user) throw new ProfilePhotoError("La modification de la photo n’est pas autorisée.");
  const id = await storeProfilePhoto(file, directory);
  try {
    const updated = await db.user.updateMany({
      where: {
        id: userId,
        profilePhotoId: user.profilePhotoId,
        accountStatus: "ACTIVE",
        emailVerifiedAt: { not: null },
        roles: { some: { role: "MENTOR" } },
      },
      data: { profilePhotoId: id },
    });
    if (!updated.count)
      throw new ProfilePhotoError("Votre profil a changé. Actualisez la page et réessayez.");
  } catch (error) {
    await removeProfilePhoto(id, directory);
    throw error;
  }
  if (user.profilePhotoId) await removeProfilePhoto(user.profilePhotoId, directory).catch(() => {});
  return id;
}
