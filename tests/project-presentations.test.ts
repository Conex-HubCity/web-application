import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { before, after, test } from "node:test";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { DomainError } from "../lib/domain/policies";
import { saveFounderProject, getFounderDashboard } from "../lib/domain/founder-dashboard";
import {
  listProjectPresentations,
  getProjectPresentation,
  requireProjectCatalogueMentor,
} from "../lib/domain/project-catalogue";
import { stripeLiveMode } from "../lib/payments/config";

const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const hasDatabase = Boolean(connectionString && !connectionString.includes("CHANGE_ME"));
const databaseTest = hasDatabase ? test : test.skip;
const schema = `cnx_presentations_test_${randomUUID().replaceAll("-", "")}`;
let control: pg.Client;
let pool: pg.Pool;
let db: PrismaClient;
let inviterId: string;
let createdSchema = false;
const checksum = "a".repeat(64);
const errorCode = (code: string) => (error: unknown) =>
  error instanceof DomainError && error.code === code;

before(async () => {
  if (!hasDatabase) return;
  control = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
  await control.connect();
  await control.query(`CREATE SCHEMA "${schema}"`);
  createdSchema = true;
  await control.query(`SET search_path TO "${schema}"`);
  const root = new URL("../prisma/migrations/", import.meta.url);
  const entries = await readdir(root, { withFileTypes: true });
  const sql = (
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
        .map((name) => readFile(new URL(`${name}/migration.sql`, root), "utf8")),
    )
  )
    .join("\n")
    .replace('CREATE SCHEMA IF NOT EXISTS "public";', "");
  assert.doesNotMatch(sql, /"public"\./);
  await control.query(sql);
  pool = new pg.Pool({ connectionString, options: `-c search_path=${schema}`, max: 6 });
  db = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  const admin = await db.user.create({
    data: {
      email: `${randomUUID()}@example.test`,
      firstName: "Admin",
      passwordHash: "fixture-only",
      emailVerifiedAt: new Date(),
      accountStatus: "ACTIVE",
      roles: { create: { role: "ADMIN" } },
    },
  });
  inviterId = admin.id;
});

after(async () => {
  await db?.$disconnect();
  if (pool && !pool.ended) await pool.end();
  if (control) {
    if (createdSchema) {
      assert.match(schema, /^cnx_presentations_test_[a-f0-9]{32}$/);
      await control.query("SET search_path TO public");
      await control.query(`DROP SCHEMA "${schema}" CASCADE`);
    }
    await control.end();
  }
});

async function founder() {
  return db.user.create({
    data: {
      email: `${randomUUID()}@example.test`,
      firstName: "Amina",
      lastName: "Founder",
      passwordHash: "fixture-only",
      emailVerifiedAt: new Date(),
      accountStatus: "ACTIVE",
      roles: { create: { role: "FOUNDER" } },
      founderProfile: { create: { adultConfirmedAt: new Date() } },
      receivedInvitation: { create: { invitedById: inviterId, acceptedAt: new Date() } },
    },
  });
}

async function mentor(options: { paid?: boolean; approved?: boolean; verified?: boolean } = {}) {
  const account = await db.user.create({
    data: {
      email: `${randomUUID()}@example.test`,
      firstName: "Mentor",
      passwordHash: "fixture-only",
      emailVerifiedAt: options.verified === false ? null : new Date(),
      accountStatus: "ACTIVE",
      roles: { create: { role: "MENTOR" } },
      mentorProfile: {
        create: {
          charterAcceptedAt: new Date(),
          verificationStatus: options.approved === false ? "PENDING" : "APPROVED",
          documents: {
            create: {
              documentType: "CV",
              privateStorageKey: `private-mentor-proof/${randomUUID()}`,
              originalFilename: "private-proof.pdf",
              mimeType: "application/pdf",
              sizeBytes: BigInt(100),
              checksum,
              scanStatus: "CLEAN",
              reviewStatus: "APPROVED",
            },
          },
        },
      },
    },
  });
  if (options.paid !== false)
    await db.contributionPayment.create({
      data: {
        userId: account.id,
        email: account.email!,
        locale: "fr",
        livemode: stripeLiveMode(),
        status: "PAID",
        paidAt: new Date(),
        stripeSessionId: `cs_fixture_${randomUUID()}`,
        stripePaymentIntentId: `pi_fixture_${randomUUID()}`,
      },
    });
  return account;
}

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    title: "A project presentation",
    summary: "A repair workshop serving the local community.",
    sector: "Circular economy",
    stage: "PROTOTYPE",
    pitchUrl: "https://video.example.test/project-pitch",
    ...overrides,
  }))
    data.set(key, value);
  data.append("supportNeeds", "Stratégie");
  return data;
}

async function project(userId: string) {
  return db.project.findUniqueOrThrow({
    where: { founderUserId: userId },
    include: { currentRevision: true },
  });
}

async function image(ownerUserId: string) {
  const id = randomUUID();
  return db.projectImage.create({
    data: {
      id,
      ownerUserId,
      fullStorageKey: `project-images/${id}/full.webp`,
      thumbnailStorageKey: `project-images/${id}/thumbnail.webp`,
      fullChecksum: checksum,
      thumbnailChecksum: checksum,
      fullWidth: 1600,
      fullHeight: 900,
      fullSizeBytes: 100,
      thumbnailWidth: 480,
      thumbnailHeight: 270,
      thumbnailSizeBytes: 30,
    },
  });
}

function assertSafe(value: unknown) {
  const json = JSON.stringify(value);
  for (const name of [
    "email",
    "passwordHash",
    "privatePitchStorageKey",
    "pitchChecksum",
    "fullStorageKey",
    "thumbnailStorageKey",
    "tokenHash",
  ])
    assert.equal(json.includes(`"${name}"`), false, name);
}

databaseTest(
  "a required safe external pitch link replaces the private draft-only presentation",
  async () => {
    const owner = await founder();
    await assert.rejects(
      saveFounderProject(owner.id, form({ pitchUrl: "" }), db),
      errorCode("INVALID_INPUT"),
    );
    for (const pitchUrl of [
      "javascript:alert(1)",
      "data:text/html,test",
      "file:///secret",
      "https://user:password@example.test/pitch",
      "//example.test/pitch",
      "not-a-link",
    ]) {
      await assert.rejects(
        saveFounderProject(owner.id, form({ pitchUrl }), db),
        errorCode("INVALID_INPUT"),
      );
    }
    assert.equal(await db.project.count({ where: { founderUserId: owner.id } }), 0);
    await saveFounderProject(owner.id, form(), db);
    const dashboard = await getFounderDashboard(owner.id, db);
    assert.equal(dashboard.project?.visible, true);
    assert.ok(dashboard.project?.presentedAt);
    assert.equal(dashboard.project?.pitchUrl, "https://video.example.test/project-pitch");
    assert.equal("status" in dashboard.project!, false);
    assert.equal(dashboard.certified, false);
    const saved = await project(owner.id);
    assert.equal(saved.currentRevision?.reviewStatus, "DRAFT");
    assert.equal(saved.currentRevision?.publishedAt, null);
    assert.equal(saved.currentRevision?.privatePitchStorageKey, null);
    assertSafe(dashboard);
  },
);

databaseTest("social links are optional and custom labelled links persist safely", async () => {
  const owner = await founder();
  const data = form({
    linkedinUrl: "https://www.linkedin.com/company/project",
    facebookUrl: "https://facebook.com/project",
    instagramUrl: "https://instagram.com/project",
  });
  data.append("linkLabel", "  Mon site  ");
  data.append("linkUrl", "https://project.example.test");
  data.append("linkLabel", "Démo produit");
  data.append("linkUrl", "https://demo.example.test/watch");
  await saveFounderProject(owner.id, data, db);
  const dashboard = await getFounderDashboard(owner.id, db);
  assert.deepEqual(
    dashboard.project?.socialLinks.map((link) => link.label),
    ["LinkedIn", "Facebook", "Instagram"],
  );
  assert.deepEqual(dashboard.project?.customLinks, [
    { label: "Mon site", url: "https://project.example.test/" },
    { label: "Démo produit", url: "https://demo.example.test/watch" },
  ]);
  for (const key of ["linkedinUrl", "facebookUrl", "instagramUrl"])
    await assert.rejects(
      saveFounderProject(owner.id, form({ [key]: "javascript:alert(1)" }), db),
      errorCode("INVALID_INPUT"),
    );
  const invalid = form();
  invalid.append("linkLabel", "Invalid");
  invalid.append("linkUrl", "data:text/html,test");
  await assert.rejects(saveFounderProject(owner.id, invalid, db), errorCode("INVALID_INPUT"));
  const missingLabel = form();
  missingLabel.append("linkLabel", "");
  missingLabel.append("linkUrl", "https://project.example.test");
  await assert.rejects(saveFounderProject(owner.id, missingLabel, db), errorCode("INVALID_INPUT"));
  await saveFounderProject(owner.id, form(), db);
  const cleared = await getFounderDashboard(owner.id, db);
  assert.deepEqual(cleared.project?.socialLinks, []);
  assert.deepEqual(cleared.project?.customLinks, []);
});

databaseTest(
  "approved paid mentors see presentations immediately without founder certification or legacy Membership",
  async () => {
    const owner = await founder();
    const reader = await mentor();
    await saveFounderProject(owner.id, form(), db);
    const saved = await project(owner.id);
    assert.equal(await db.certificationEvidence.count({ where: { founderUserId: owner.id } }), 0);
    assert.equal(await db.membership.count({ where: { mentorUserId: reader.id } }), 0);
    const listed = (await listProjectPresentations(reader.id, db)).find(
      (item) => item.id === saved.id,
    );
    assert.ok(listed);
    assert.equal(listed.pitchUrl, "https://video.example.test/project-pitch");
    assert.equal(listed.isOwner, false);
    assert.deepEqual(listed.founder, { firstName: "Amina", lastName: "Founder" });
    const detail = await getProjectPresentation(reader.id, saved.id, db);
    assert.ok(detail);
    assertSafe(detail);
    const own = await getProjectPresentation(owner.id, saved.id, db);
    assert.equal(own?.isOwner, true);
    assert.equal(
      await db.mentorshipRequest.count({ where: { projectRevisionId: saved.currentRevisionId! } }),
      0,
    );
  },
);

databaseTest(
  "catalogue authorization rejects unpaid, unapproved and unverified mentors and hides foreign owner projects",
  async () => {
    const owner = await founder();
    const stranger = await founder();
    await saveFounderProject(owner.id, form(), db);
    const saved = await project(owner.id);
    for (const options of [{ paid: false }, { approved: false }, { verified: false }]) {
      const reader = await mentor(options);
      await assert.rejects(
        listProjectPresentations(reader.id, db),
        errorCode("CATALOGUE_FORBIDDEN"),
      );
      await assert.rejects(
        getProjectPresentation(reader.id, saved.id, db),
        errorCode("CATALOGUE_FORBIDDEN"),
      );
    }
    await assert.rejects(
      listProjectPresentations(stranger.id, db),
      errorCode("CATALOGUE_FORBIDDEN"),
    );
    assert.equal(await getProjectPresentation(stranger.id, saved.id, db), null);
    const reader = await mentor();
    await db.mentorProfile.update({
      where: { userId: reader.id },
      data: { charterAcceptedAt: null },
    });
    await assert.rejects(
      requireProjectCatalogueMentor(reader.id, db),
      errorCode("CATALOGUE_FORBIDDEN"),
    );
    await db.mentorProfile.update({
      where: { userId: reader.id },
      data: { charterAcceptedAt: new Date() },
    });
    await db.mentorDocument.updateMany({
      where: { mentorUserId: reader.id },
      data: { reviewStatus: "REVOKED", withdrawnAt: new Date() },
    });
    await assert.rejects(
      requireProjectCatalogueMentor(reader.id, db),
      errorCode("CATALOGUE_FORBIDDEN"),
    );
  },
);

databaseTest(
  "presentation visibility uses only the current revision and excludes archived or rejected records",
  async () => {
    const owner = await founder();
    const reader = await mentor();
    await saveFounderProject(owner.id, form(), db);
    const saved = await project(owner.id);
    const newest = await db.projectRevision.create({
      data: {
        projectId: saved.id,
        revisionNumber: 2,
        title: "Current presentation",
        summary: "Current details",
        pitchUrl: "https://video.example.test/current",
        presentedAt: new Date(),
      },
    });
    await db.project.update({ where: { id: saved.id }, data: { currentRevisionId: newest.id } });
    const ownRows = (await listProjectPresentations(reader.id, db)).filter(
      (item) => item.id === saved.id,
    );
    assert.equal(ownRows.length, 1);
    assert.equal(ownRows[0].revisionId, newest.id);
    assert.equal(ownRows[0].title, "Current presentation");
    await db.projectRevision.update({ where: { id: newest.id }, data: { archivedAt: new Date() } });
    assert.equal(
      (await listProjectPresentations(reader.id, db)).some((item) => item.id === saved.id),
      false,
    );
    assert.equal(await getProjectPresentation(reader.id, saved.id, db), null);
    await db.projectRevision.update({
      where: { id: newest.id },
      data: {
        archivedAt: null,
        reviewStatus: "REJECTED",
        submittedAt: new Date(),
        privatePitchStorageKey: `private-project-pitch/${randomUUID()}`,
        pitchOriginalFilename: "private-pitch.pdf",
        pitchSizeBytes: BigInt(100),
        pitchChecksum: checksum,
        pitchScanStatus: "CLEAN",
      },
    });
    assert.equal(
      (await listProjectPresentations(reader.id, db)).some((item) => item.id === saved.id),
      false,
    );
    assert.equal(await getProjectPresentation(reader.id, saved.id, db), null);
  },
);

databaseTest(
  "editing and concurrent first saves preserve a single project and one current presentation",
  async () => {
    const owner = await founder();
    await Promise.all([
      saveFounderProject(owner.id, form({ title: "First request" }), db),
      saveFounderProject(owner.id, form({ title: "Second request" }), db),
    ]);
    const saved = await project(owner.id);
    assert.equal(await db.project.count({ where: { founderUserId: owner.id } }), 1);
    assert.equal(await db.projectRevision.count({ where: { projectId: saved.id } }), 1);
    const date = saved.currentRevision!.presentedAt;
    await saveFounderProject(owner.id, form({ title: "Updated presentation" }), db);
    const updated = await project(owner.id);
    assert.equal(updated.id, saved.id);
    assert.equal(updated.currentRevisionId, saved.currentRevisionId);
    assert.equal(updated.currentRevision?.title, "Updated presentation");
    assert.equal(updated.currentRevision?.presentedAt?.getTime(), date?.getTime());
    assert.equal(
      await db.mentorshipRequest.count({ where: { projectRevisionId: saved.currentRevisionId! } }),
      0,
    );
  },
);

databaseTest(
  "branding references must belong to the founder and DTO image URLs expose neither storage keys nor checksums",
  async () => {
    const owner = await founder();
    const foreignOwner = await founder();
    const reader = await mentor();
    const foreign = await image(foreignOwner.id);
    await assert.rejects(
      saveFounderProject(owner.id, form({ brandingImageId: foreign.id }), db),
      errorCode("IMAGE_UNAVAILABLE"),
    );
    assert.equal(await db.project.count({ where: { founderUserId: owner.id } }), 0);
    const ownedImage = await image(owner.id);
    await saveFounderProject(owner.id, form({ brandingImageId: ownedImage.id }), db);
    const saved = await project(owner.id);
    const detail = await getProjectPresentation(reader.id, saved.id, db);
    assert.ok(detail?.image);
    assert.equal(detail.image.id, ownedImage.id);
    assert.equal(detail.image.fullUrl, `/api/project-images/${ownedImage.id}/full`);
    assert.equal(detail.image.thumbnailUrl, `/api/project-images/${ownedImage.id}/thumbnail`);
    assert.equal(detail.image.width, 1600);
    assertSafe(detail);
  },
);
