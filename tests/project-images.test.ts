import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Jimp, JimpMime } from "jimp";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { DomainError } from "../lib/domain/policies";
import { stripeLiveMode } from "../lib/payments/config";
import {
  MAX_PROJECT_IMAGE_BYTES,
  readProjectImage,
  uploadProjectImage,
} from "../lib/projects/images";

const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const hasDatabase = Boolean(connectionString && !connectionString.includes("CHANGE_ME"));
const imageTest = hasDatabase ? test : test.skip;
const schema = `cnx_images_test_${randomUUID().replaceAll("-", "")}`;
let control: pg.Client;
let pool: pg.Pool;
let db: PrismaClient;
let created = false;
let adminId: string;
before(async () => {
  if (!hasDatabase) return;
  control = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
  await control.connect();
  await control.query(`CREATE SCHEMA "${schema}"`);
  created = true;
  await control.query(`SET search_path TO "${schema}"`);
  const root = new URL("../prisma/migrations/", import.meta.url);
  const entries = await readdir(root, { withFileTypes: true });
  const migrations = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .map((name) => readFile(new URL(`${name}/migration.sql`, root), "utf8")),
  );
  const sql = migrations.join("\n").replace('CREATE SCHEMA IF NOT EXISTS "public";', "");
  assert.doesNotMatch(sql, /"public"\./);
  await control.query(sql);
  pool = new pg.Pool({ connectionString, options: `-c search_path=${schema}`, max: 6 });
  db = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  adminId = (
    await db.user.create({
      data: {
        email: `${randomUUID()}@example.test`,
        firstName: "Image fixture admin",
        passwordHash: "fixture-no-login",
        accountStatus: "ACTIVE",
        emailVerifiedAt: new Date(),
        roles: { create: { role: "ADMIN" } },
      },
    })
  ).id;
});
after(async () => {
  await db?.$disconnect();
  if (pool && !pool.ended) await pool.end();
  if (control) {
    if (created) {
      assert.match(schema, /^cnx_images_test_[a-f0-9]{32}$/);
      await control.query("SET search_path TO public");
      await control.query(`DROP SCHEMA "${schema}" CASCADE`);
    }
    await control.end();
  }
});
async function folder<T>(run: (directory: string) => Promise<T>) {
  const directory = await mkdtemp(path.join(tmpdir(), "cnx-project-images-test-"));
  try {
    return await run(directory);
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.match(path.basename(directory), /^cnx-project-images-test-/);
    await rm(directory, { recursive: true, force: true });
  }
}
async function founder() {
  return db.user.create({
    data: {
      email: `${randomUUID()}@example.test`,
      firstName: "Image fixture founder",
      passwordHash: "fixture-no-login",
      accountStatus: "ACTIVE",
      emailVerifiedAt: new Date(),
      roles: { create: { role: "FOUNDER" } },
      founderProfile: { create: { adultConfirmedAt: new Date() } },
      receivedInvitation: { create: { invitedById: adminId, acceptedAt: new Date() } },
    },
  });
}
async function mentor() {
  return db.user.create({
    data: {
      email: `${randomUUID()}@example.test`,
      firstName: "Image fixture mentor",
      passwordHash: "fixture-no-login",
      accountStatus: "ACTIVE",
      emailVerifiedAt: new Date(),
      roles: { create: { role: "MENTOR" } },
      mentorProfile: {
        create: {
          verificationStatus: "APPROVED",
          charterAcceptedAt: new Date(),
          documents: {
            create: {
              documentType: "CV",
              originalFilename: "fixture.pdf",
              privateStorageKey: "mentors/" + randomUUID(),
              mimeType: "application/pdf",
              sizeBytes: BigInt(100),
              checksum: "a".repeat(64),
              scanStatus: "CLEAN",
              reviewStatus: "APPROVED",
            },
          },
        },
      },
      contributionPayments: {
        create: {
          email: "fixture@example.test",
          locale: "fr",
          livemode: stripeLiveMode(),
          status: "PAID",
          paidAt: new Date(),
        },
      },
    },
  });
}
async function pngFile() {
  const data = await new Jimp({ width: 960, height: 640, color: 0x558366ff }).getBuffer(
    JimpMime.png,
  );
  return new File([new Uint8Array(data)], "../../ignored-name.png", { type: "image/png" });
}
function code(expected: string) {
  return (error: unknown) => error instanceof DomainError && error.code === expected;
}

imageTest("project images produce full and thumbnail PNG variants", async () => {
  await folder(async (directory) => {
    const user = await founder();
    const source = await new Jimp({ width: 2400, height: 1600, color: 0x558366ff }).getBuffer(
      JimpMime.jpeg,
    );
    const image = await uploadProjectImage(
      user.id,
      new File([new Uint8Array(source)], "camera.jpg", { type: "image/jpeg" }),
      db,
      directory,
    );
    assert.equal(image.width, 1800);
    assert.equal(image.height, 1200);
    assert.equal("fullStorageKey" in image, false);
    assert.equal("ownerUserId" in image, false);
    assert.equal(image.fullUrl, `/api/project-images/${image.id}/full`);
    const full = await readProjectImage(user.id, image.id, "full", db, directory);
    const thumb = await readProjectImage(user.id, image.id, "thumbnail", db, directory);
    assert.ok(full);
    assert.ok(thumb);
    const fullMetadata = await Jimp.fromBuffer(full.buffer);
    const thumbMetadata = await Jimp.fromBuffer(thumb.buffer);
    assert.equal(fullMetadata.bitmap.width, 1800);
    assert.equal(fullMetadata.bitmap.height, 1200);
    assert.equal(thumbMetadata.bitmap.width, 480);
    assert.equal(thumbMetadata.bitmap.height, 320);
    assert.deepEqual((await readdir(path.join(directory, image.id))).sort(), [
      "full.png",
      "thumbnail.png",
    ]);
  });
});

imageTest(
  "project image uploads reject SVG, invalid, oversized and animated files before writing",
  async () => {
    await folder(async (directory) => {
      const user = await founder();
      const invalid = [
        new File(["<svg xmlns='http://www.w3.org/2000/svg'/>"], "fake.png", { type: "image/png" }),
        new File(["invalid"], "fake.jpg", { type: "image/jpeg" }),
        new File([new Uint8Array(Buffer.from("RIFFxxxxWEBP"))], "unsupported.webp", {
          type: "image/webp",
        }),
      ];
      for (const file of invalid)
        await assert.rejects(
          uploadProjectImage(user.id, file, db, directory),
          code("INVALID_PROJECT_IMAGE"),
        );
      await assert.rejects(
        uploadProjectImage(
          user.id,
          new File([new Uint8Array(MAX_PROJECT_IMAGE_BYTES + 1)], "large.png", {
            type: "image/png",
          }),
          db,
          directory,
        ),
        code("PROJECT_IMAGE_TOO_LARGE"),
      );
      assert.deepEqual(await readdir(directory), []);
      assert.equal(await db.projectImage.count({ where: { ownerUserId: user.id } }), 0);
      const viewer = await mentor();
      await assert.rejects(
        uploadProjectImage(viewer.id, await pngFile(), db, directory),
        code("FOUNDER_UNAVAILABLE"),
      );
    });
  },
);

imageTest(
  "image access is owner-only until a current visible presentation exists, then paid approved mentors may read",
  async () => {
    await folder(async (directory) => {
      const owner = await founder();
      const stranger = await founder();
      const viewer = await mentor();
      const image = await uploadProjectImage(owner.id, await pngFile(), db, directory);
      assert.ok(await readProjectImage(owner.id, image.id, "thumbnail", db, directory));
      assert.equal(await readProjectImage(stranger.id, image.id, "full", db, directory), null);
      assert.equal(await readProjectImage(randomUUID(), image.id, "full", db, directory), null);
      assert.equal(await readProjectImage(adminId, image.id, "full", db, directory), null);
      assert.equal(await readProjectImage(viewer.id, image.id, "full", db, directory), null);
      const project = await db.project.create({
        data: {
          founderUserId: owner.id,
          revisions: {
            create: {
              title: "Image fixture project",
              revisionNumber: 1,
              pitchUrl: "https://example.test/pitch",
              presentedAt: new Date(),
              brandingImageId: image.id,
            },
          },
        },
        include: { revisions: true },
      });
      await db.project.update({
        where: { id: project.id },
        data: { currentRevisionId: project.revisions[0].id },
      });
      assert.ok(await readProjectImage(viewer.id, image.id, "thumbnail", db, directory));
      const nextRevision = await db.projectRevision.create({
        data: {
          projectId: project.id,
          revisionNumber: 2,
          title: "New current presentation",
          pitchUrl: "https://example.test/new-pitch",
          presentedAt: new Date(),
        },
      });
      await db.project.update({
        where: { id: project.id },
        data: { currentRevisionId: nextRevision.id },
      });
      assert.equal(await readProjectImage(viewer.id, image.id, "thumbnail", db, directory), null);
      await db.project.update({
        where: { id: project.id },
        data: { currentRevisionId: project.revisions[0].id },
      });
      await db.projectRevision.update({
        where: { id: project.revisions[0].id },
        data: { archivedAt: new Date() },
      });
      assert.equal(await readProjectImage(viewer.id, image.id, "thumbnail", db, directory), null);
      await db.projectRevision.update({
        where: { id: project.revisions[0].id },
        data: { archivedAt: null },
      });
      await db.contributionPayment.updateMany({
        where: { userId: viewer.id },
        data: { status: "FAILED" },
      });
      assert.equal(await readProjectImage(viewer.id, image.id, "thumbnail", db, directory), null);
      await db.contributionPayment.updateMany({
        where: { userId: viewer.id },
        data: { status: "PAID" },
      });
      await db.projectRevision.update({
        where: { id: project.revisions[0].id },
        data: {
          reviewStatus: "REJECTED",
          submittedAt: new Date(),
          privatePitchStorageKey: "fixture/" + randomUUID(),
          pitchOriginalFilename: "fixture.pdf",
          pitchSizeBytes: BigInt(100),
          pitchChecksum: "a".repeat(64),
          pitchScanStatus: "CLEAN",
        },
      });
      assert.equal(await readProjectImage(viewer.id, image.id, "thumbnail", db, directory), null);
      assert.ok(await readProjectImage(owner.id, image.id, "full", db, directory));
      assert.equal(await readProjectImage(owner.id, image.id, "../full", db, directory), null);
      await db.user.update({ where: { id: owner.id }, data: { accountStatus: "SUSPENDED" } });
      assert.equal(await readProjectImage(owner.id, image.id, "full", db, directory), null);
    });
  },
);

imageTest("corrupt image content or storage metadata is never returned", async () => {
  await folder(async (directory) => {
    const owner = await founder();
    const image = await uploadProjectImage(owner.id, await pngFile(), db, directory);
    await writeFile(path.join(directory, image.id, "full.png"), "corrupt");
    assert.equal(await readProjectImage(owner.id, image.id, "full", db, directory), null);
    await db.projectImage.update({
      where: { id: image.id },
      data: { thumbnailStorageKey: "projects/../../outside" },
    });
    assert.equal(await readProjectImage(owner.id, image.id, "thumbnail", db, directory), null);
  });
});

imageTest("upload quota is checked without leaving additional files", async () => {
  await folder(async (directory) => {
    const owner = await founder();
    const image = await uploadProjectImage(owner.id, await pngFile(), db, directory);
    const source = await db.projectImage.findUniqueOrThrow({ where: { id: image.id } });
    await db.projectImage.createMany({
      data: Array.from({ length: 19 }, () => {
        const id = randomUUID();
        return {
          ...source,
          id,
          fullStorageKey: `projects/${id}/full.webp`,
          thumbnailStorageKey: `projects/${id}/thumbnail.webp`,
        };
      }),
    });
    await assert.rejects(
      uploadProjectImage(owner.id, await pngFile(), db, directory),
      code("PROJECT_IMAGE_LIMIT"),
    );
    assert.deepEqual(await readdir(directory), [image.id]);
  });
});

imageTest(
  "a database failure rolls back image metadata and removes both generated files",
  async () => {
    await folder(async (directory) => {
      const owner = await founder();
      await control.query(
        `CREATE FUNCTION reject_test_image() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'isolated image fixture rejection'; END $$`,
      );
      await control.query(
        `CREATE TRIGGER reject_test_image BEFORE INSERT ON project_images FOR EACH ROW EXECUTE FUNCTION reject_test_image()`,
      );
      try {
        await assert.rejects(uploadProjectImage(owner.id, await pngFile(), db, directory));
        assert.deepEqual(await readdir(directory), []);
        assert.equal(await db.projectImage.count({ where: { ownerUserId: owner.id } }), 0);
      } finally {
        await control.query("DROP TRIGGER reject_test_image ON project_images");
        await control.query("DROP FUNCTION reject_test_image()");
      }
    });
  },
);
