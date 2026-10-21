import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import pg from "pg";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../generated/prisma/client";
import { createPlatformService } from "../lib/domain/platform-service";
import { AuthError, createAuthService } from "../lib/auth/service";
import { createOnboardingService } from "../lib/onboarding/service";
import { MAX_CERTIFICATION_BYTES } from "../lib/onboarding/policy";
import {
  createMentorOnboardingService,
  MAX_MENTOR_UPLOAD_BYTES,
} from "../lib/onboarding/mentor-service";
import { mentorDestination } from "../lib/onboarding/mentor-policy";
import { getMentorDashboard } from "../lib/domain/mentor-dashboard";
import {
  DomainError,
  PROJECT_REPLACEMENT_DELAY_MS,
  assertProjectReplacement,
} from "../lib/domain/policies";

const DAY = 86400000;
const hash = "a".repeat(64);
const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const hasDatabase = Boolean(connectionString && !connectionString.includes("CHANGE_ME"));
const schema = `conex_test_${randomUUID().replaceAll("-", "")}`;
async function migrationSql() {
  const root = new URL("../prisma/migrations/", import.meta.url);
  const entries = await readdir(root, { withFileTypes: true });
  const names = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  return (
    await Promise.all(names.map((name) => readFile(new URL(`${name}/migration.sql`, root), "utf8")))
  ).join("\n");
}
let control: pg.Client;
let pool: pg.Pool;
let db: PrismaClient;
let service: ReturnType<typeof createPlatformService>;
let schemaCreated = false;

before(async () => {
  if (!hasDatabase) return;
  // A unique schema is created exclusively for this run. Existing tables are never touched.
  control = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
  await control.connect();
  await control.query(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  await control.query(`SET search_path TO "${schema}"`);
  const sql = (await migrationSql()).replace('CREATE SCHEMA IF NOT EXISTS "public";', "");
  assert.doesNotMatch(sql, /"public"\./);
  await control.query(sql);
  pool = new pg.Pool({ connectionString, options: `-c search_path=${schema}`, max: 6 });
  db = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  service = createPlatformService(db);
});

after(async () => {
  await db?.$disconnect();
  if (pool && !pool.ended) await pool.end();
  if (control) {
    if (schemaCreated) {
      // Never drop a computed or pre-existing application schema.
      assert.match(schema, /^conex_test_[a-f0-9]{32}$/);
      await control.query("SET search_path TO public");
      await control.query(`DROP SCHEMA "${schema}" CASCADE`);
    }
    await control.end();
  }
});

const databaseTest = hasDatabase ? test : test.skip;
const expectCode = (code: string) => (error: unknown) =>
  error instanceof DomainError && error.code === code;

async function user(role: Role) {
  return db.user.create({
    data: {
      email: `${randomUUID()}@example.test`,
      passwordHash: "test-only-hash",
      firstName: "Test",
      accountStatus: "ACTIVE",
      emailVerifiedAt: new Date(),
      roles: { create: { role } },
      ...(role === "FOUNDER"
        ? { founderProfile: { create: { adultConfirmedAt: new Date() } } }
        : {}),
      ...(role === "MENTOR"
        ? {
            mentorProfile: {
              create: { verificationStatus: "APPROVED", charterAcceptedAt: new Date() },
            },
          }
        : {}),
    },
  });
}

async function fixture() {
  const admin = await user("ADMIN");
  const founder = await user("FOUNDER");
  const mentor = await user("MENTOR");
  await db.membership.create({
    data: {
      mentorUserId: mentor.id,
      status: "ACTIVE",
      startsAt: new Date(Date.now() - 90 * DAY),
      endsAt: new Date(Date.now() + 90 * DAY),
    },
  });
  const certificate = await db.certificationEvidence.create({
    data: {
      founderUserId: founder.id,
      privateStorageKey: randomUUID(),
      originalFilename: "red.pdf",
      mimeType: "application/pdf",
      sizeBytes: BigInt(100),
      checksum: hash,
      holderName: "Test",
      scanStatus: "CLEAN",
      verificationStatus: "APPROVED",
    },
  });
  const project = await service.createProject(founder.id, { title: "Initial project" });
  const revisionId = project.currentRevision!.id;
  // Simulate metadata produced by the trusted upload/scanning pipeline.
  await db.projectRevision.update({
    where: { id: revisionId },
    data: {
      privatePitchStorageKey: randomUUID(),
      pitchOriginalFilename: "pitch.pdf",
      pitchSizeBytes: BigInt(200),
      pitchChecksum: hash,
      pitchScanStatus: "CLEAN",
    },
  });
  return { admin, founder, mentor, project, revisionId, certificate };
}

async function publish(f: Awaited<ReturnType<typeof fixture>>, daysAgo = 0) {
  await service.submitProject(f.founder.id, f.project.id);
  if (daysAgo)
    await db.projectRevision.update({
      where: { id: f.revisionId },
      data: { submittedAt: new Date(Date.now() - daysAgo * DAY) },
    });
  await service.recordValidation(f.admin.id, { kind: "PROJECT", id: f.revisionId }, "APPROVED");
  await service.publishProject(f.admin.id, f.project.id);
}

test("replacement boundary is exactly 30 elapsed days, and both conditions are mandatory", () => {
  const now = new Date("2026-10-20T12:00:00Z");
  const submittedAt = new Date(now.getTime() - PROJECT_REPLACEMENT_DELAY_MS);
  assert.doesNotThrow(() =>
    assertProjectReplacement({ hasOpenMentorship: false, submittedAt, lastFollowUpAt: null, now }),
  );
  assert.throws(
    () =>
      assertProjectReplacement({ hasOpenMentorship: true, submittedAt, lastFollowUpAt: null, now }),
    expectCode("MENTORSHIP_OPEN"),
  );
  assert.throws(
    () =>
      assertProjectReplacement({
        hasOpenMentorship: false,
        submittedAt,
        lastFollowUpAt: new Date(now.getTime() - PROJECT_REPLACEMENT_DELAY_MS + 1),
        now,
      }),
    expectCode("REPLACEMENT_TOO_EARLY"),
  );
});

databaseTest(
  "registration persists private role profiles and hashed sessions, without approving accounts",
  async () => {
    const auth = createAuthService(db);
    for (const role of ["FOUNDER", "MENTOR"] as const) {
      const email = `${randomUUID()}@example.test`;
      const session = await auth.register({
        email: ` ${email.toUpperCase()} `,
        password: "a long test passphrase",
        passwordConfirmation: "a long test passphrase",
        firstName: "Alice",
        lastName: "  Johnson  ",
        role,
        adultConfirmed: true,
      });
      const account = await auth.getSession(session.token);
      assert.ok(account);
      assert.deepEqual(account.roles, [{ role }]);
      assert.equal(account.accountStatus, "PENDING_VERIFICATION");
      assert.equal("passwordHash" in account, false);
      const stored = await db.user.findUniqueOrThrow({
        where: { id: account.id },
        include: { founderProfile: true, mentorProfile: true, sessions: true },
      });
      assert.match(stored.passwordHash, /^scrypt-v1:/);
      assert.notEqual(stored.passwordHash, "a long test passphrase");
      assert.equal(stored.emailVerifiedAt, null);
      assert.equal(stored.lastName, "Johnson");
      assert.notEqual(stored.sessions[0].tokenHash, session.token);
      if (role === "FOUNDER") assert.ok(stored.founderProfile?.adultConfirmedAt);
      else {
        assert.equal(stored.mentorProfile?.visibilityPreference, "PRIVATE");
        assert.equal(stored.mentorProfile?.verificationStatus, "DRAFT");
      }
      await assert.rejects(
        auth.register({
          email,
          password: "another long passphrase",
          passwordConfirmation: "another long passphrase",
          firstName: "Bob",
          lastName: "Smith",
          role,
          adultConfirmed: true,
        }),
        AuthError,
      );
      const credentialsWithForgedRole = {
        email,
        password: "a long test passphrase",
        role: "ADMIN",
      };
      const login = await auth.login(credentialsWithForgedRole);
      assert.deepEqual((await auth.getSession(login.token))?.roles, [{ role }]);
      await auth.logout(login.token);
      assert.equal(await auth.getSession(login.token), null);
      assert.equal(await auth.getSession(session.token.slice(1)), null);
      await db.session.updateMany({
        where: { userId: account.id },
        data: { createdAt: new Date(Date.now() - 2 * DAY), expiresAt: new Date(Date.now() - DAY) },
      });
      assert.equal(await auth.getSession(session.token), null);
    }
  },
);

databaseTest(
  "founder onboarding checks stored certification; local test upload unlocks only its owner",
  async () => {
    const folder = await mkdtemp(path.join(tmpdir(), "conex-upload-test-"));
    const env: Record<string, string | undefined> = process.env;
    const previous = { mode: env.CERTIFICATION_TEST_MODE, node: env.NODE_ENV };
    env.CERTIFICATION_TEST_MODE = "true";
    env.NODE_ENV = "test";
    try {
      const onboarding = createOnboardingService(db, folder);
      const founder = await user("FOUNDER");
      const other = await user("FOUNDER");
      const mentor = await user("MENTOR");
      assert.equal((await onboarding.getProfile(founder.id))?.isCertified, false);
      assert.equal((await onboarding.getProfile(mentor.id))?.isFounder, false);
      const file = new File(["any local test content"], "../../proof.txt", { type: "text/plain" });
      const results = await Promise.all([
        onboarding.uploadCertification(founder.id, file),
        onboarding.uploadCertification(founder.id, file),
      ]);
      assert.ok(results.every((result) => result.certified));
      const evidence = await db.certificationEvidence.findFirstOrThrow({
        where: { founderUserId: founder.id },
      });
      assert.equal(evidence.originalFilename, "proof.txt");
      assert.equal(evidence.isTest, true);
      assert.equal(evidence.verificationStatus, "APPROVED");
      assert.equal(
        await readFile(path.join(folder, evidence.privateStorageKey.split("/")[1]), "utf8"),
        "any local test content",
      );
      assert.equal((await readdir(folder)).length, 1);
      assert.equal(
        await db.certificationEvidence.count({ where: { founderUserId: founder.id } }),
        1,
      );
      assert.equal((await onboarding.getProfile(founder.id))?.isCertified, true);
      assert.equal((await onboarding.getProfile(other.id))?.isCertified, false);
      assert.equal("privateStorageKey" in (await onboarding.getProfile(founder.id))!, false);
      await assert.rejects(
        db.certificationEvidence.update({ where: { id: evidence.id }, data: { isTest: false } }),
      );
      env.NODE_ENV = "production";
      assert.equal((await onboarding.getProfile(founder.id))?.isCertified, false);
      const project = await service.createProject(founder.id, {
        title: "Test certification isolation",
      });
      await assert.rejects(
        service.submitProject(founder.id, project.id),
        expectCode("CERTIFICATION_REQUIRED"),
      );
      env.NODE_ENV = "test";
      await db.certificationEvidence.update({
        where: { id: evidence.id },
        data: { verificationStatus: "REVOKED" },
      });
      assert.equal((await onboarding.getProfile(founder.id))?.isCertified, false);
    } finally {
      for (const [key, value] of [
        ["CERTIFICATION_TEST_MODE", previous.mode],
        ["NODE_ENV", previous.node],
      ] as const) {
        if (value === undefined) delete env[key];
        else env[key] = value;
      }
      assert.equal(path.dirname(path.resolve(folder)), path.resolve(tmpdir()));
      assert.match(path.basename(folder), /^conex-upload-test-/);
      await rm(folder, { recursive: true, force: true });
    }
  },
);

databaseTest(
  "certification uploads reject invalid files and mentors; production never auto approves",
  async () => {
    const folder = await mkdtemp(path.join(tmpdir(), "conex-upload-test-"));
    const env: Record<string, string | undefined> = process.env;
    const previous = { mode: env.CERTIFICATION_TEST_MODE, node: env.NODE_ENV };
    env.CERTIFICATION_TEST_MODE = "true";
    env.NODE_ENV = "production";
    try {
      const onboarding = createOnboardingService(db, folder);
      const founder = await user("FOUNDER");
      const mentor = await user("MENTOR");
      await db.user.update({
        where: { id: founder.id },
        data: { accountStatus: "PENDING_VERIFICATION", emailVerifiedAt: null },
      });
      await assert.rejects(
        onboarding.uploadCertification(founder.id, new File([], "empty.pdf")),
        AuthError,
      );
      await assert.rejects(
        onboarding.uploadCertification(
          founder.id,
          new File([new Uint8Array(MAX_CERTIFICATION_BYTES + 1)], "large.pdf"),
        ),
        AuthError,
      );
      const file = new File(["certificate"], "document.pdf", { type: "application/pdf" });
      await assert.rejects(onboarding.uploadCertification(mentor.id, file), AuthError);
      assert.equal((await readdir(folder)).length, 0);
      assert.deepEqual(await onboarding.uploadCertification(founder.id, file), {
        certified: false,
      });
      const evidence = await db.certificationEvidence.findFirstOrThrow({
        where: { founderUserId: founder.id },
      });
      assert.equal(evidence.isTest, false);
      assert.equal(evidence.verificationStatus, "PENDING");
      assert.equal(evidence.scanStatus, "PENDING");
      assert.equal((await onboarding.getProfile(founder.id))?.isCertified, false);
      const stored = await db.user.findUniqueOrThrow({ where: { id: founder.id } });
      assert.equal(stored.accountStatus, "PENDING_VERIFICATION");
      assert.equal(stored.emailVerifiedAt, null);
      await db.user.update({ where: { id: founder.id }, data: { accountStatus: "SUSPENDED" } });
      assert.equal(await onboarding.getProfile(founder.id), null);
      await assert.rejects(onboarding.uploadCertification(founder.id, file), AuthError);
    } finally {
      for (const [key, value] of [
        ["CERTIFICATION_TEST_MODE", previous.mode],
        ["NODE_ENV", previous.node],
      ] as const) {
        if (value === undefined) delete env[key];
        else env[key] = value;
      }
      assert.equal(path.dirname(path.resolve(folder)), path.resolve(tmpdir()));
      assert.match(path.basename(folder), /^conex-upload-test-/);
      await rm(folder, { recursive: true, force: true });
    }
  },
);

databaseTest(
  "auth rejects privileged signup, invalid input, bad passwords, disabled accounts and throttles persistently",
  async () => {
    const auth = createAuthService(db);
    const input = {
      email: `${randomUUID()}@example.test`,
      password: "Pass123!",
      passwordConfirmation: "Pass123!",
      firstName: "Alice",
      lastName: "Johnson",
      role: "MENTOR",
      adultConfirmed: true,
    };
    await assert.rejects(auth.register({ ...input, role: "ADMIN" }), AuthError);
    await assert.rejects(auth.register({ ...input, lastName: "  " }), AuthError);
    await assert.rejects(auth.register({ ...input, lastName: "a".repeat(101) }), AuthError);
    await assert.rejects(auth.register({ ...input, adultConfirmed: false }), AuthError);
    await assert.rejects(
      auth.register({ ...input, password: "1234567", passwordConfirmation: "1234567" }),
      /entre 8 et 128/,
    );
    await assert.rejects(
      auth.register({ ...input, passwordConfirmation: "different" }),
      /identiques/,
    );
    await assert.rejects(
      auth.register({ ...input, passwordConfirmation: undefined }),
      /identiques/,
    );
    assert.equal(await db.user.count({ where: { email: input.email } }), 0);
    const session = await auth.register(input);
    const account = (await auth.getSession(session.token))!;
    await assert.rejects(
      auth.login({ email: input.email, password: "a wrong test passphrase" }),
      /Email ou mot de passe incorrect/,
    );
    for (const accountStatus of ["SUSPENDED", "CLOSED"] as const) {
      await db.user.update({ where: { id: account.id }, data: { accountStatus } });
      assert.equal(await auth.getSession(session.token), null);
      await assert.rejects(auth.login(input), /Email ou mot de passe incorrect/);
    }
    const email = `${randomUUID()}@example.test`;
    const results = await Promise.allSettled(
      Array.from({ length: 7 }, () =>
        createAuthService(db).login({ email, password: "unknown account passphrase" }),
      ),
    );
    assert.equal(
      results.filter(
        (result) =>
          result.status === "rejected" && /Trop de tentatives/.test(String(result.reason)),
      ).length,
      2,
    );
    const errors = results
      .filter((result) => result.status === "rejected")
      .map((result) => String(result.reason));
    assert.equal(
      errors.filter((message) => /Email ou mot de passe incorrect/.test(message)).length,
      5,
    );
  },
);

databaseTest(
  "migration enforces contact, normalization, exact validation targets and immutable audit",
  async () => {
    await assert.rejects(
      db.user.create({ data: { firstName: "No contact", passwordHash: "hash" } }),
    );
    await assert.rejects(
      db.user.create({
        data: { firstName: "Mixed case", passwordHash: "hash", email: "UPPER@example.test" },
      }),
    );
    const f = await fixture();
    await assert.rejects(
      db.validationDecision.create({ data: { reviewerUserId: f.admin.id, outcome: "APPROVED" } }),
    );
    await assert.rejects(
      db.validationDecision.create({
        data: {
          reviewerUserId: f.admin.id,
          outcome: "APPROVED",
          mentorUserId: f.mentor.id,
          certificationEvidenceId: f.certificate.id,
        },
      }),
    );
    const decision = await db.validationDecision.create({
      data: {
        reviewerUserId: f.admin.id,
        outcome: "APPROVED",
        certificationEvidenceId: f.certificate.id,
      },
    });
    await assert.rejects(
      db.validationDecision.update({ where: { id: decision.id }, data: { reason: "rewrite" } }),
    );
    await assert.rejects(db.validationDecision.delete({ where: { id: decision.id } }));
  },
);

databaseTest("account context exposes stored roles, never password hashes", async () => {
  const founder = await user("FOUNDER");
  const context = await service.getAccountContext(founder.id);
  assert.deepEqual(context.roles, ["FOUNDER"]);
  assert.equal("passwordHash" in context, false);
  await assert.rejects(
    service.recordValidation(founder.id, { kind: "MENTOR", id: founder.id }, "APPROVED"),
    expectCode("FORBIDDEN"),
  );
});

databaseTest(
  "one project per founder; certification and pitch approval are independent",
  async () => {
    const f = await fixture();
    await assert.rejects(service.createProject(f.founder.id, { title: "Second project" }));
    await db.certificationEvidence.update({
      where: { id: f.certificate.id },
      data: { verificationStatus: "PENDING" },
    });
    await assert.rejects(
      service.submitProject(f.founder.id, f.project.id),
      expectCode("CERTIFICATION_REQUIRED"),
    );
    await db.certificationEvidence.update({
      where: { id: f.certificate.id },
      data: { verificationStatus: "APPROVED" },
    });
    await service.submitProject(f.founder.id, f.project.id);
    await assert.rejects(
      service.publishProject(f.admin.id, f.project.id),
      expectCode("PROJECT_NOT_APPROVED"),
    );
    await service.recordValidation(f.admin.id, { kind: "PROJECT", id: f.revisionId }, "APPROVED");
    await service.publishProject(f.admin.id, f.project.id);
    const visible = await service.listAvailableProjects(f.mentor.id);
    assert(visible.some((entry) => entry.id === f.project.id));
    assert.equal(JSON.stringify(visible).includes("privatePitchStorageKey"), false);
    await service.recordValidation(
      f.admin.id,
      { kind: "CERTIFICATION", id: f.certificate.id },
      "REVOKED",
      "Certificate withdrawn",
    );
    assert.equal(
      (await service.listAvailableProjects(f.mentor.id)).some((entry) => entry.id === f.project.id),
      false,
    );
  },
);

databaseTest(
  "private mentors can access eligible projects, expired memberships cannot",
  async () => {
    const f = await fixture();
    await publish(f);
    await service.setMentorVisibility(f.mentor.id, "PRIVATE");
    assert(
      (await service.listAvailableProjects(f.mentor.id)).some((entry) => entry.id === f.project.id),
    );
    const membership = await db.membership.findFirstOrThrow({
      where: { mentorUserId: f.mentor.id },
    });
    await db.membership.update({
      where: { id: membership.id },
      data: { endsAt: new Date(Date.now() - DAY) },
    });
    await assert.rejects(
      service.authorizeProjectDocument(f.mentor.id, f.revisionId),
      expectCode("MEMBERSHIP_REQUIRED"),
    );
  },
);

databaseTest(
  "mentor evidence is private, immutable and attached to the correct owner",
  async () => {
    const f = await fixture();
    const document = await service.registerMentorDocument(f.mentor.id, {
      documentType: "CV",
      originalFilename: "cv.pdf",
      privateStorageKey: randomUUID(),
      mimeType: "application/pdf",
      sizeBytes: BigInt(100),
      checksum: hash,
    });
    await assert.rejects(
      db.mentorDocument.update({ where: { id: document.id }, data: { checksum: "b".repeat(64) } }),
    );
    const other = await user("MENTOR");
    await assert.rejects(
      service.registerMentorDocument(other.id, {
        documentType: "CV",
        originalFilename: "cv.pdf",
        privateStorageKey: randomUUID(),
        mimeType: "application/pdf",
        sizeBytes: BigInt(100),
        checksum: hash,
        supersedesDocumentId: document.id,
      }),
    );
    await assert.rejects(
      service.withdrawMentorDocument(other.id, document.id),
      expectCode("FORBIDDEN"),
    );
    await db.mentorDocument.update({ where: { id: document.id }, data: { scanStatus: "CLEAN" } });
    await service.recordValidation(
      f.admin.id,
      { kind: "MENTOR_DOCUMENT", id: document.id },
      "APPROVED",
    );
    await db.mentorProfile.update({
      where: { userId: f.mentor.id },
      data: { verificationStatus: "PENDING" },
    });
    const approval = await service.recordValidation(
      f.admin.id,
      { kind: "MENTOR", id: f.mentor.id, evidenceIds: [document.id] },
      "APPROVED",
    );
    await service.withdrawMentorDocument(f.mentor.id, document.id);
    assert.equal(
      (await db.mentorProfile.findUniqueOrThrow({ where: { userId: f.mentor.id } }))
        .verificationStatus,
      "PENDING",
    );
    assert.equal(
      await db.mentorValidationDocument.count({ where: { decisionId: approval.id } }),
      1,
    );
  },
);

databaseTest(
  "activation requires CNX approval, a meeting and both participants' consent",
  async () => {
    const f = await fixture();
    await publish(f, 40);
    const request = await service.requestMentorship(f.mentor.id, f.revisionId);
    await assert.rejects(
      service.activateMentorship(f.admin.id, request.id),
      expectCode("CONSENT_REQUIRED"),
    );
    await service.approveMentorshipRequest(f.admin.id, request.id);
    await assert.rejects(
      service.consentToMentorship(f.founder.id, request.id),
      expectCode("INVALID_TRANSITION"),
    );
    await service.recordIntroMeeting(f.admin.id, request.id, new Date());
    await service.consentToMentorship(f.mentor.id, request.id);
    await assert.rejects(
      service.activateMentorship(f.admin.id, request.id),
      expectCode("CONSENT_REQUIRED"),
    );
    await service.consentToMentorship(f.founder.id, request.id);
    const mentorship = await service.activateMentorship(f.admin.id, request.id);
    await assert.rejects(
      service.replaceProject(f.founder.id, f.project.id, { title: "Blocked" }),
      expectCode("MENTORSHIP_OPEN"),
    );
    await db.mentorship.update({ where: { id: mentorship.id }, data: { status: "PAUSED" } });
    await assert.rejects(
      service.replaceProject(f.founder.id, f.project.id, { title: "Still blocked" }),
      expectCode("MENTORSHIP_OPEN"),
    );
    const followUp = await service.recordFollowUp(f.founder.id, mentorship.id, {
      type: "MEETING",
      summary: "Meeting completed",
      occurredAt: new Date(),
    });
    await assert.rejects(
      service.approveFollowUp(f.founder.id, followUp.id),
      expectCode("FORBIDDEN"),
    );
    await service.approveFollowUp(f.admin.id, followUp.id);
    await assert.rejects(
      db.followUp.update({
        where: { id: followUp.id },
        data: { occurredAt: new Date(Date.now() - 40 * DAY) },
      }),
    );
    await service.closeMentorship(f.admin.id, mentorship.id, "Goals complete");
    await assert.rejects(
      service.replaceProject(f.founder.id, f.project.id, { title: "Too soon" }),
      expectCode("REPLACEMENT_TOO_EARLY"),
    );
  },
);

databaseTest(
  "replacement after 30 days preserves old content and starts a draft requiring review",
  async () => {
    const f = await fixture();
    await publish(f, 31);
    const oldRequest = await service.requestMentorship(f.mentor.id, f.revisionId);
    const revision = await service.replaceProject(f.founder.id, f.project.id, {
      title: "New project",
    });
    assert.equal(revision.reviewStatus, "DRAFT");
    assert.equal(revision.revisionNumber, 2);
    assert.equal(revision.publishedAt, null);
    assert(
      (await db.projectRevision.findUniqueOrThrow({ where: { id: f.revisionId } })).archivedAt,
    );
    assert.equal(
      (await db.mentorshipRequest.findUniqueOrThrow({ where: { id: oldRequest.id } }))
        .projectRevisionId,
      f.revisionId,
    );
    await assert.rejects(
      service.approveMentorshipRequest(f.admin.id, oldRequest.id),
      expectCode("PROJECT_UNAVAILABLE"),
    );
    await assert.rejects(
      db.projectRevision.update({
        where: { id: f.revisionId },
        data: { title: "Rewrite history" },
      }),
    );
    const another = await fixture();
    await assert.rejects(
      db.project.update({
        where: { id: another.project.id },
        data: { currentRevisionId: revision.id },
      }),
    );
  },
);

test("initial migration runs on an isolated PostgreSQL engine without application credentials", async () => {
  const embedded = new PGlite();
  try {
    await embedded.exec(await migrationSql());
    const tables = await embedded.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
    );
    assert.equal(tables.rows[0].count, 16);
    await assert.rejects(
      embedded.query(
        "INSERT INTO users(id,password_hash,first_name,updated_at) VALUES ($1,'test','No contact',now())",
        [randomUUID()],
      ),
    );
  } finally {
    await embedded.close();
  }
});

databaseTest("mentor visibility never publishes CVs or certificate evidence", async () => {
  const f = await fixture();
  await assert.rejects(
    db.certificationEvidence.update({
      where: { id: f.certificate.id },
      data: { privateStorageKey: randomUUID() },
    }),
  );
  const otherFounder = await user("FOUNDER");
  await assert.rejects(
    db.project.update({ where: { id: f.project.id }, data: { founderUserId: otherFounder.id } }),
  );
  const doc = await service.registerMentorDocument(f.mentor.id, {
    documentType: "CV",
    originalFilename: "private.pdf",
    privateStorageKey: randomUUID(),
    mimeType: "application/pdf",
    sizeBytes: BigInt(100),
    checksum: hash,
  });
  await db.mentorDocument.update({ where: { id: doc.id }, data: { scanStatus: "CLEAN" } });
  await service.setMentorVisibility(f.mentor.id, "PLATFORM");
  const visible = await service.listVisibleMentors(f.founder.id);
  assert(visible.some((entry) => entry.userId === f.mentor.id));
  assert.equal(JSON.stringify(visible).includes("privateStorageKey"), false);
  await assert.rejects(
    service.authorizeMentorDocument(f.founder.id, doc.id),
    expectCode("FORBIDDEN"),
  );
  await assert.rejects(
    service.authorizeCertificationDocument(f.mentor.id, f.certificate.id),
    expectCode("FORBIDDEN"),
  );
  assert.equal(
    (await service.authorizeMentorDocument(f.mentor.id, doc.id)).storageKey,
    doc.privateStorageKey,
  );
  await service.setMentorVisibility(f.mentor.id, "PRIVATE");
  assert.equal(
    (await service.listVisibleMentors(f.founder.id)).some((entry) => entry.userId === f.mentor.id),
    false,
  );
});

databaseTest(
  "concurrent project replacement and mentorship activation cannot both succeed",
  async () => {
    const f = await fixture();
    await publish(f, 40);
    const request = await service.requestMentorship(f.mentor.id, f.revisionId);
    await service.approveMentorshipRequest(f.admin.id, request.id);
    await db.projectRevision.update({
      where: { id: f.revisionId },
      data: { publishedAt: new Date(Date.now() - 39 * DAY) },
    });
    await db.mentorshipRequest.update({
      where: { id: request.id },
      data: {
        createdAt: new Date(Date.now() - 38 * DAY),
        reviewedAt: new Date(Date.now() - 37 * DAY),
      },
    });
    await service.recordIntroMeeting(f.admin.id, request.id, new Date(Date.now() - 35 * DAY));
    await service.consentToMentorship(f.mentor.id, request.id);
    await service.consentToMentorship(f.founder.id, request.id);
    const outcomes = await Promise.allSettled([
      service.activateMentorship(f.admin.id, request.id),
      service.replaceProject(f.founder.id, f.project.id, { title: "Concurrent replacement" }),
    ]);
    assert.equal(outcomes.filter((result) => result.status === "fulfilled").length, 1);
    const project = await db.project.findUniqueOrThrow({ where: { id: f.project.id } });
    const active = await db.mentorship.count({
      where: { requestId: request.id, status: "ACTIVE" },
    });
    assert(!(project.currentRevisionId !== f.revisionId && active > 0));
  },
);

databaseTest(
  "a recent introduction blocks replacement even when the participant declines",
  async () => {
    const f = await fixture();
    await publish(f, 40);
    const request = await service.requestMentorship(f.mentor.id, f.revisionId);
    await service.approveMentorshipRequest(f.admin.id, request.id);
    await service.recordIntroMeeting(f.admin.id, request.id, new Date());
    await service.declineMentorship(f.founder.id, request.id);
    await assert.rejects(
      service.activateMentorship(f.admin.id, request.id),
      expectCode("CONSENT_REQUIRED"),
    );
    await assert.rejects(
      service.replaceProject(f.founder.id, f.project.id, { title: "Too early after meeting" }),
      expectCode("REPLACEMENT_TOO_EARLY"),
    );
  },
);

databaseTest("draft input cannot inject review state, publication or file approval", async () => {
  const founder = await user("FOUNDER");
  const input = {
    title: "Untrusted form",
    reviewStatus: "APPROVED",
    publishedAt: new Date(),
    pitchScanStatus: "CLEAN",
  };
  const project = await service.createProject(founder.id, input);
  assert.equal(project.currentRevision?.reviewStatus, "DRAFT");
  assert.equal(project.currentRevision?.publishedAt, null);
  assert.equal(project.currentRevision?.pitchScanStatus, "PENDING");
  await service.updateProjectDraft(founder.id, project.id, input);
  assert.equal(
    (await db.projectRevision.findUniqueOrThrow({ where: { id: project.currentRevision!.id } }))
      .reviewStatus,
    "DRAFT",
  );
});

async function withMentorUploads(
  run: (service: ReturnType<typeof createMentorOnboardingService>, folder: string) => Promise<void>,
) {
  const folder = await mkdtemp(path.join(tmpdir(), "conex-mentor-test-"));
  try {
    await run(createMentorOnboardingService(db, folder), folder);
  } finally {
    assert.equal(path.dirname(path.resolve(folder)), path.resolve(tmpdir()));
    assert.match(path.basename(folder), /^conex-mentor-test-/);
    await rm(folder, { recursive: true, force: true });
  }
}

async function newMentorCandidate() {
  const mentor = await user("MENTOR");
  await db.mentorProfile.update({
    where: { userId: mentor.id },
    data: { verificationStatus: "DRAFT", charterAcceptedAt: null },
  });
  await db.user.update({
    where: { id: mentor.id },
    data: { accountStatus: "PENDING_VERIFICATION", emailVerifiedAt: null },
  });
  return mentor;
}

function mentorSubmission() {
  return {
    documents: [
      {
        file: new File(["%PDF-1.7\nCV test"], "cv.pdf", { type: "application/pdf" }),
        documentType: "CV" as const,
      },
    ],
    charterAccepted: true,
    professionalTitle: "  Architecte  ",
    biography: "Une expérience professionnelle.",
  };
}

databaseTest(
  "mentor onboarding gates pending accounts; submission is private, pending and idempotent",
  async () => {
    await withMentorUploads(async (onboarding, folder) => {
      const mentor = await newMentorCandidate();
      const profiles = createOnboardingService(db);
      assert.equal(
        mentorDestination((await profiles.getProfile(mentor.id))!),
        "/mentor/candidature",
      );
      await Promise.all([
        onboarding.submit(mentor.id, mentorSubmission()),
        onboarding.submit(mentor.id, mentorSubmission()),
      ]);
      const profile = (await profiles.getProfile(mentor.id))!;
      assert.equal(mentorDestination(profile), "/mentor/validation");
      assert.equal(profile.isMentorApproved, false);
      assert.equal(profile.mentorStatus, "PENDING");
      assert.equal(profile.mentorProfessionalTitle, "Architecte");
      assert.equal(profile.mentorDocuments.length, 1);
      assert.equal("privateStorageKey" in profile.mentorDocuments[0], false);
      const proof = await db.mentorDocument.findFirstOrThrow({
        where: { mentorUserId: mentor.id },
      });
      assert.equal(proof.scanStatus, "PENDING");
      assert.equal(proof.reviewStatus, "PENDING");
      assert.equal(proof.originalFilename, "cv.pdf");
      assert.match(proof.privateStorageKey, /^mentors\/[a-f0-9-]{36}$/);
      assert.equal(
        await readFile(path.join(folder, proof.privateStorageKey.split("/")[1]), "utf8"),
        "%PDF-1.7\nCV test",
      );
      assert.equal((await readdir(folder)).length, 1);
      const stored = await db.user.findUniqueOrThrow({
        where: { id: mentor.id },
        include: { mentorProfile: true },
      });
      assert.equal(stored.accountStatus, "PENDING_VERIFICATION");
      assert.equal(stored.emailVerifiedAt, null);
      assert.ok(stored.mentorProfile?.submittedAt);
      assert.ok(stored.mentorProfile?.charterAcceptedAt);
      assert.equal(stored.mentorProfile?.visibilityPreference, "PRIVATE");
    });
  },
);

databaseTest(
  "mentor document and candidature approvals unlock dashboard; rejection and withdrawal close it",
  async () => {
    await withMentorUploads(async (onboarding) => {
      const mentor = await newMentorCandidate();
      const admin = await user("ADMIN");
      const profiles = createOnboardingService(db);
      await onboarding.submit(mentor.id, mentorSubmission());
      const proof = await db.mentorDocument.findFirstOrThrow({
        where: { mentorUserId: mentor.id },
      });
      await assert.rejects(
        service.recordValidation(
          admin.id,
          { kind: "MENTOR", id: mentor.id, evidenceIds: [proof.id] },
          "APPROVED",
        ),
      );
      // Trusted scanning result, never supplied by the applicant.
      await db.mentorDocument.update({ where: { id: proof.id }, data: { scanStatus: "CLEAN" } });
      await service.recordValidation(
        admin.id,
        { kind: "MENTOR_DOCUMENT", id: proof.id },
        "APPROVED",
      );
      assert.equal(
        mentorDestination((await profiles.getProfile(mentor.id))!),
        "/mentor/validation",
      );
      await service.recordValidation(
        admin.id,
        { kind: "MENTOR", id: mentor.id, evidenceIds: [proof.id] },
        "APPROVED",
      );
      assert.equal(mentorDestination((await profiles.getProfile(mentor.id))!), null);
      assert.equal((await profiles.getProfile(mentor.id))?.isMentorApproved, true);
      await assert.rejects(onboarding.submit(mentor.id, mentorSubmission()), AuthError);
      await db.user.update({
        where: { id: mentor.id },
        data: { accountStatus: "ACTIVE", emailVerifiedAt: new Date() },
      });
      await assert.rejects(
        service.listAvailableProjects(mentor.id),
        expectCode("MEMBERSHIP_REQUIRED"),
      );
      await service.withdrawMentorDocument(mentor.id, proof.id);
      assert.equal(
        mentorDestination((await profiles.getProfile(mentor.id))!),
        "/mentor/candidature",
      );
      await onboarding.submit(mentor.id, mentorSubmission());
      await service.recordValidation(
        admin.id,
        { kind: "MENTOR", id: mentor.id },
        "REJECTED",
        "Merci de compléter votre dossier.",
      );
      assert.equal(
        mentorDestination((await profiles.getProfile(mentor.id))!),
        "/mentor/candidature",
      );
      await onboarding.submit(mentor.id, mentorSubmission());
      assert.equal(
        mentorDestination((await profiles.getProfile(mentor.id))!),
        "/mentor/validation",
      );
      assert.equal(
        (await db.mentorDocument.findUniqueOrThrow({ where: { id: proof.id } })).privateStorageKey,
        proof.privateStorageKey,
      );
    });
  },
);

databaseTest(
  "mentor submission rejects unauthorized actors, missing consent and invalid uploads without writing files",
  async () => {
    await withMentorUploads(async (onboarding, folder) => {
      const mentor = await newMentorCandidate();
      const founder = await user("FOUNDER");
      await assert.rejects(onboarding.submit(founder.id, mentorSubmission()), AuthError);
      await assert.rejects(
        onboarding.submit(mentor.id, { ...mentorSubmission(), charterAccepted: false }),
        AuthError,
      );
      await assert.rejects(
        onboarding.submit(mentor.id, { ...mentorSubmission(), documents: [] }),
        AuthError,
      );
      await assert.rejects(
        onboarding.submit(mentor.id, {
          ...mentorSubmission(),
          documents: Array.from({ length: 6 }, () => mentorSubmission().documents[0]),
        }),
        AuthError,
      );
      await assert.rejects(
        onboarding.submit(mentor.id, {
          ...mentorSubmission(),
          documents: [{ file: new File([], "empty.pdf"), documentType: "CV" }],
        }),
        AuthError,
      );
      await assert.rejects(
        onboarding.submit(mentor.id, {
          ...mentorSubmission(),
          documents: [
            {
              file: new File([new Uint8Array(MAX_MENTOR_UPLOAD_BYTES + 1)], "large.pdf"),
              documentType: "CV",
            },
          ],
        }),
        AuthError,
      );
      await assert.rejects(
        onboarding.submit(mentor.id, {
          ...mentorSubmission(),
          documents: [{ file: new File(["not a PDF"], "fake.pdf"), documentType: "CV" }],
        }),
        AuthError,
      );
      await db.user.update({ where: { id: mentor.id }, data: { accountStatus: "SUSPENDED" } });
      await assert.rejects(onboarding.submit(mentor.id, mentorSubmission()), AuthError);
      assert.equal((await readdir(folder)).length, 0);
      assert.equal(await db.mentorDocument.count({ where: { mentorUserId: mentor.id } }), 0);
    });
  },
);

databaseTest(
  "mentor submission rolls back metadata and removes files if the database rejects profile content",
  async () => {
    await withMentorUploads(async (onboarding, folder) => {
      const mentor = await newMentorCandidate();
      await assert.rejects(
        onboarding.submit(mentor.id, { ...mentorSubmission(), biography: String.fromCharCode(0) }),
      );
      assert.equal((await readdir(folder)).length, 0);
      assert.equal(await db.mentorDocument.count({ where: { mentorUserId: mentor.id } }), 0);
      assert.equal(
        (await db.mentorProfile.findUniqueOrThrow({ where: { userId: mentor.id } }))
          .verificationStatus,
        "DRAFT",
      );
    });
  },
);

databaseTest(
  "mentor dashboard reads only owned activity and protects the catalogue behind current rights",
  async () => {
    const f = await fixture();
    await db.mentorDocument.create({
      data: {
        mentorUserId: f.mentor.id,
        documentType: "CV",
        originalFilename: "cv.pdf",
        privateStorageKey: `mentors/${randomUUID()}`,
        mimeType: "application/pdf",
        sizeBytes: BigInt(100),
        checksum: hash,
        scanStatus: "CLEAN",
        reviewStatus: "APPROVED",
      },
    });
    await db.projectRevision.update({
      where: { id: f.revisionId },
      data: { supportNeeds: ["Stratégie", "Commercialisation"] },
    });
    await publish(f);
    const request = await service.requestMentorship(f.mentor.id, f.revisionId);
    const other = await user("MENTOR");
    await db.mentorshipRequest.create({
      data: { mentorUserId: other.id, projectRevisionId: f.revisionId },
    });
    const dashboard = await getMentorDashboard(f.mentor.id, db);
    assert.ok(dashboard);
    assert.equal(dashboard.canBrowse, true);
    assert.equal(dashboard.membershipActive, true);
    assert.deepEqual(
      dashboard.requests.map((entry) => entry.id),
      [request.id],
    );
    assert.equal(
      dashboard.projects.find((project) => project.id === f.project.id)?.supportNeeds,
      "Stratégie, Commercialisation",
    );
    assert.doesNotMatch(
      JSON.stringify(dashboard),
      /passwordHash|privateStorageKey|privatePitchStorageKey|checksum/,
    );
    assert.equal(await getMentorDashboard(f.founder.id, db), null);
    assert.equal(await getMentorDashboard(other.id, db), null);
    await db.membership.updateMany({
      where: { mentorUserId: f.mentor.id },
      data: { status: "EXPIRED" },
    });
    const expired = await getMentorDashboard(f.mentor.id, db);
    assert.ok(expired);
    assert.equal(expired.membershipActive, false);
    assert.equal(expired.canBrowse, false);
    assert.deepEqual(expired.projects, []);
    assert.deepEqual(
      expired.requests.map((entry) => entry.id),
      [request.id],
    );
    await db.mentorProfile.update({
      where: { userId: f.mentor.id },
      data: { verificationStatus: "PENDING" },
    });
    assert.equal(await getMentorDashboard(f.mentor.id, db), null);
  },
);
