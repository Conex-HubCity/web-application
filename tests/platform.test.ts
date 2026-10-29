import { getFounderDashboard, saveFounderProject } from "../lib/domain/founder-dashboard";
import {
  createPasswordLinkService,
  passwordLinkOrigin,
  type PasswordMail,
} from "../lib/auth/password-links";
import type Stripe from "stripe";
import { createContributionService, type PaymentGateway } from "../lib/payments/service";
import { PaymentError, stripeConfig, stripeLiveMode } from "../lib/payments/config";
import { MENTOR_CHARTER_VERSION } from "../lib/mentor-charter";
import "dotenv/config";
import { createEmailVerificationService } from "../lib/auth/email-verification";
import { createAdminService } from "../lib/admin/service";
import { readAdminDocument } from "../lib/admin/documents";
import { isMentorPreviewEnabled } from "../lib/release";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, readdir, mkdtemp, rm } from "node:fs/promises";
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
import { saveMentorProfile } from "../lib/domain/mentor-profile";
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
  const created = await db.user.create({
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
  if (role === "MENTOR") await paidContribution(created.id);
  return created;
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
    const auth = createAuthService(db, { mentorPreview: false, founderRegistration: true });
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
        charterAccepted: true,
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
        assert.ok(stored.mentorProfile?.charterAcceptedAt);
        assert.equal(stored.mentorProfile?.charterVersion, MENTOR_CHARTER_VERSION);
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
          charterAccepted: true,
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
      await assert.rejects(onboarding.uploadCertification(founder.id, file), AuthError);
      await db.user.update({ where: { id: founder.id }, data: { emailVerifiedAt: new Date() } });
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
      assert.ok(stored.emailVerifiedAt);
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
    const auth = createAuthService(db, { mentorPreview: false, founderRegistration: true });
    const input = {
      email: `${randomUUID()}@example.test`,
      password: "Pass123!",
      passwordConfirmation: "Pass123!",
      firstName: "Alice",
      lastName: "Johnson",
      role: "MENTOR",
      adultConfirmed: true,
      charterAccepted: true,
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
    for (const charterAccepted of [false, undefined, "true", "on"]) {
      await assert.rejects(auth.register({ ...input, charterAccepted }), /charte du mentorat/);
    }
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
        createAuthService(db, { mentorPreview: false, founderRegistration: true }).login({
          email,
          password: "unknown account passphrase",
        }),
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
    assert.equal(tables.rows[0].count, 22);
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
    data: { accountStatus: "ACTIVE", emailVerifiedAt: new Date() },
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
  "mentor onboarding gates verified accounts; submission is private, pending and idempotent",
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
      assert.equal(stored.accountStatus, "ACTIVE");
      assert.ok(stored.emailVerifiedAt);
      assert.ok(stored.mentorProfile?.submittedAt);
      assert.ok(stored.mentorProfile?.charterAcceptedAt);
      assert.equal(stored.mentorProfile?.charterVersion, MENTOR_CHARTER_VERSION);
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

function profileForm() {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    firstName: "Alice",
    lastName: "Smith",
    professionalTitle: "Architecte",
    biography: "Mon expérience",
    city: "Lomé",
    countryCode: "tg",
    expertise: "Architecture, Conseil, Architecture",
    languages: "Français, Anglais",
    visibility: "PLATFORM",
  }))
    form.set(key, value);
  return form;
}

databaseTest(
  "mentor profile edits persist only allowed fields and enforce account eligibility",
  async () => {
    const mentor = await user("MENTOR");
    const other = await user("MENTOR");
    const form = profileForm();
    form.set("userId", other.id);
    form.set("verificationStatus", "REVOKED");
    form.set("email", "changed@example.test");
    await saveMentorProfile(mentor.id, form, db);
    const saved = await db.user.findUniqueOrThrow({
      where: { id: mentor.id },
      include: { mentorProfile: true },
    });
    assert.equal(saved.firstName, "Alice");
    assert.equal(saved.email, mentor.email);
    assert.equal(saved.mentorProfile!.countryCode, "TG");
    assert.deepEqual(saved.mentorProfile!.expertise, ["Architecture", "Conseil"]);
    assert.equal(saved.mentorProfile!.verificationStatus, "APPROVED");
    assert.ok(saved.mentorProfile!.visibilityRequestedAt);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: other.id } })).firstName, "Test");
    const privateForm = profileForm();
    privateForm.set("visibility", "PRIVATE");
    await saveMentorProfile(mentor.id, privateForm, db);
    assert.equal(
      (await db.mentorProfile.findUniqueOrThrow({ where: { userId: mentor.id } }))
        .visibilityRequestedAt,
      null,
    );
    const invalid = profileForm();
    invalid.set("biography", "x".repeat(4001));
    await assert.rejects(saveMentorProfile(mentor.id, invalid, db), AuthError);
    const founder = await user("FOUNDER");
    await assert.rejects(saveMentorProfile(founder.id, profileForm(), db), AuthError);
    const candidate = await newMentorCandidate();
    await assert.rejects(saveMentorProfile(candidate.id, profileForm(), db), AuthError);
    await db.user.update({ where: { id: mentor.id }, data: { accountStatus: "SUSPENDED" } });
    await assert.rejects(saveMentorProfile(mentor.id, profileForm(), db), AuthError);
  },
);

databaseTest(
  "additional mentor documents stay pending without revoking approved candidature",
  async () => {
    await withMentorUploads(async (onboarding, folder) => {
      const mentor = await user("MENTOR");
      await db.mentorDocument.create({
        data: {
          mentorUserId: mentor.id,
          documentType: "CV",
          originalFilename: "approved.pdf",
          privateStorageKey: randomUUID(),
          mimeType: "application/pdf",
          sizeBytes: BigInt(100),
          checksum: hash,
          scanStatus: "CLEAN",
          reviewStatus: "APPROVED",
        },
      });
      assert.ok(await getMentorDashboard(mentor.id, db));
      await onboarding.submit(mentor.id, { ...mentorSubmission(), charterAccepted: false }, true);
      const docs = await db.mentorDocument.findMany({ where: { mentorUserId: mentor.id } });
      assert.equal(docs.length, 2);
      const added = docs.find((doc) => doc.reviewStatus === "PENDING")!;
      assert.equal(added.scanStatus, "PENDING");
      assert.equal((await readdir(folder)).length, 1);
      assert.ok(await getMentorDashboard(mentor.id, db));
      const candidate = await newMentorCandidate();
      await assert.rejects(onboarding.submit(candidate.id, mentorSubmission(), true), AuthError);
      await db.user.update({ where: { id: mentor.id }, data: { accountStatus: "SUSPENDED" } });
      await assert.rejects(onboarding.submit(mentor.id, mentorSubmission(), true), AuthError);
      assert.equal((await readdir(folder)).length, 1);
    });
  },
);

test("mentor preview is enabled only by the explicit server flag", () => {
  assert.equal(isMentorPreviewEnabled("true"), true);
  for (const value of ["false", "", "TRUE", "1"])
    assert.equal(isMentorPreviewEnabled(value), false);
});

databaseTest(
  "mentor preview rejects founder registration, login and existing sessions; full mode remains available",
  async () => {
    const preview = createAuthService(db, { mentorPreview: true });
    const full = createAuthService(db, { mentorPreview: false, founderRegistration: true });
    const email = `preview-${randomUUID()}@example.test`;
    const input = {
      email,
      password: "preview account password",
      passwordConfirmation: "preview account password",
      firstName: "Preview",
      lastName: "Test",
      role: "FOUNDER",
      adultConfirmed: true,
      charterAccepted: true,
    };
    await assert.rejects(preview.register(input), AuthError);
    assert.equal(await db.user.count({ where: { email } }), 0);
    const session = await full.register(input);
    const account = await db.user.findUniqueOrThrow({ where: { email } });
    assert.ok(await full.getSession(session.token));
    assert.equal(await preview.getSession(session.token), null);
    const sessionsBefore = await db.session.count({ where: { userId: account.id } });
    await assert.rejects(preview.login({ email, password: input.password }), AuthError);
    assert.equal(await db.session.count({ where: { userId: account.id } }), sessionsBefore);
    assert.ok(await full.login({ email, password: input.password }));
  },
);

databaseTest(
  "mentor preview preserves mentor registration, sign-in and document submission",
  async () => {
    const auth = createAuthService(db, { mentorPreview: true });
    const input = {
      email: `preview-${randomUUID()}@example.test`,
      password: "preview mentor password",
      passwordConfirmation: "preview mentor password",
      firstName: "Preview",
      lastName: "Mentor",
      role: "MENTOR",
      adultConfirmed: true,
      charterAccepted: true,
    };
    const registered = await auth.register(input);
    const actor = await auth.getSession(registered.token);
    assert.ok(actor);
    assert.equal(actor.accountStatus, "PENDING_VERIFICATION");
    const login = await auth.login({ email: input.email, password: input.password });
    assert.equal((await auth.getSession(login.token))?.id, actor.id);
    await withMentorUploads(async (onboarding) => {
      await assert.rejects(onboarding.submit(actor.id, mentorSubmission()), AuthError);
      let code = "";
      const verification = createEmailVerificationService(db, {
        secret: "test-secret-".repeat(4),
        send: async (message) => {
          code = message.code;
        },
      });
      await verification.issue(actor.id, "fr");
      await verification.verify(actor.id, code);
      await assert.rejects(onboarding.submit(actor.id, mentorSubmission()), /contribution/);
      await paidContribution(actor.id);
      await onboarding.submit(actor.id, mentorSubmission());
      assert.equal(
        (await db.mentorProfile.findUniqueOrThrow({ where: { userId: actor.id } }))
          .verificationStatus,
        "PENDING",
      );
      assert.equal(await db.mentorDocument.count({ where: { mentorUserId: actor.id } }), 1);
    });
  },
);

databaseTest(
  "admin lists and details enforce fresh roles and never expose authentication or storage secrets",
  async () => {
    const admin = await user("ADMIN");
    const mentor = await user("MENTOR");
    const founder = await user("FOUNDER");
    const consoleService = createAdminService(db);
    await assert.rejects(consoleService.listUsers(mentor.id), expectCode("ADMIN_REQUIRED"));
    await assert.rejects(
      consoleService.getApplication(founder.id, mentor.id),
      expectCode("ADMIN_REQUIRED"),
    );
    await withMentorUploads(async (onboarding) => {
      const candidate = await newMentorCandidate();
      await onboarding.submit(candidate.id, mentorSubmission());
      const stored = await db.user.findUniqueOrThrow({ where: { id: candidate.id } });
      const users = await consoleService.listUsers(admin.id, {
        q: stored.email!,
        role: "MENTOR",
        page: "99999",
      });
      assert.equal(users.total, 1);
      assert.equal(users.page, 1);
      assert.equal(users.rows[0].id, candidate.id);
      const applications = await consoleService.listApplications(admin.id, {
        q: stored.email!,
        status: "PENDING",
      });
      assert.equal(applications.total, 1);
      assert.equal(applications.rows[0]._count.documents, 1);
      assert.equal(
        (await consoleService.listApplications(admin.id, { q: stored.email!, status: "APPROVED" }))
          .total,
        0,
      );
      const application = await consoleService.getApplication(admin.id, candidate.id);
      assert.equal(application?.documents.length, 1);
      const detail = await consoleService.getUser(admin.id, candidate.id);
      assert.equal(detail?.email, stored.email);
      const payload = JSON.stringify({ users, applications, application, detail }, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      );
      for (const secret of ["passwordHash", "tokenHash", "privateStorageKey", "checksum"])
        assert.ok(!payload.includes(secret));
      await assert.rejects(consoleService.getUser(admin.id, "invalid-id"), expectCode("NOT_FOUND"));
    });
    await db.userRole.delete({ where: { userId_role: { userId: admin.id, role: "ADMIN" } } });
    await assert.rejects(consoleService.listUsers(admin.id), expectCode("ADMIN_REQUIRED"));
    const disabled = await user("ADMIN");
    await db.user.update({ where: { id: disabled.id }, data: { accountStatus: "SUSPENDED" } });
    await assert.rejects(
      consoleService.listApplications(disabled.id),
      expectCode("ADMIN_REQUIRED"),
    );
  },
);

databaseTest(
  "private admin document reads verify permission, storage boundaries and file integrity",
  async () => {
    const admin = await user("ADMIN");
    const mentor = await newMentorCandidate();
    await withMentorUploads(async (onboarding, folder) => {
      await onboarding.submit(mentor.id, mentorSubmission());
      const doc = await db.mentorDocument.findFirstOrThrow({ where: { mentorUserId: mentor.id } });
      await assert.rejects(
        readAdminDocument(mentor.id, doc.id, db, folder),
        expectCode("ADMIN_REQUIRED"),
      );
      const file = await readAdminDocument(admin.id, doc.id, db, folder);
      assert.equal(file.name, "cv.pdf");
      assert.ok(file.buffer.toString().startsWith("%PDF-"));
      await writeFile(path.join(folder, path.basename(doc.privateStorageKey)), "corrupted content");
      await assert.rejects(
        readAdminDocument(admin.id, doc.id, db, folder),
        expectCode("NOT_FOUND"),
      );
      await db.mentorDocument.update({ where: { id: doc.id }, data: { scanStatus: "REJECTED" } });
      await assert.rejects(
        readAdminDocument(admin.id, doc.id, db, folder),
        expectCode("NOT_FOUND"),
      );
      const invalid = await db.mentorDocument.create({
        data: {
          mentorUserId: mentor.id,
          documentType: "CV",
          originalFilename: "bad.pdf",
          privateStorageKey: "../../.env",
          mimeType: "application/pdf",
          sizeBytes: BigInt(20),
          checksum: hash,
        },
      });
      await assert.rejects(
        readAdminDocument(admin.id, invalid.id, db, folder),
        expectCode("NOT_FOUND"),
      );
    });
  },
);

databaseTest(
  "email OTP verifies ownership once, rotates sessions and never approves mentor evidence",
  async () => {
    const userAccount = await newMentorCandidate();
    await db.user.update({
      where: { id: userAccount.id },
      data: { accountStatus: "PENDING_VERIFICATION", emailVerifiedAt: null },
    });
    let code = "";
    const verification = createEmailVerificationService(db, {
      secret: "otp-test-secret-".repeat(4),
      send: async (message) => {
        code = message.code;
      },
    });
    const oldToken = "b".repeat(64);
    await db.session.create({
      data: {
        userId: userAccount.id,
        tokenHash: (await import("node:crypto"))
          .createHash("sha256")
          .update(oldToken)
          .digest("hex"),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    await verification.issue(userAccount.id, "en");
    assert.match(code, /^\d{6}$/);
    const record = await db.emailVerification.findUniqueOrThrow({
      where: { userId: userAccount.id },
    });
    assert.equal(record.deliveryStatus, "SENT");
    assert.notEqual(record.codeHash, code);
    assert.equal(record.codeHash.length, 64);
    const another = await newMentorCandidate();
    await db.user.update({
      where: { id: another.id },
      data: { emailVerifiedAt: null, accountStatus: "PENDING_VERIFICATION" },
    });
    await assert.rejects(verification.verify(another.id, code), AuthError);
    const session = await verification.verify(userAccount.id, code);
    const auth = createAuthService(db, { mentorPreview: false, founderRegistration: true });
    assert.equal(await auth.getSession(oldToken), null);
    assert.ok((await auth.getSession(session.token))?.emailVerifiedAt);
    const saved = await db.user.findUniqueOrThrow({
      where: { id: userAccount.id },
      include: { mentorProfile: true },
    });
    assert.equal(saved.accountStatus, "ACTIVE");
    assert.ok(saved.emailVerifiedAt);
    assert.equal(saved.mentorProfile!.verificationStatus, "DRAFT");
    await assert.rejects(verification.verify(userAccount.id, code), AuthError);
  },
);

databaseTest("OTP expiry, resend, attempt limits and delivery failures fail closed", async () => {
  const mentor = await newMentorCandidate();
  await db.user.update({
    where: { id: mentor.id },
    data: { accountStatus: "PENDING_VERIFICATION", emailVerifiedAt: null },
  });
  let time = Date.now();
  const codes: string[] = [];
  const options = {
    secret: "otp-test-secret-".repeat(4),
    now: () => new Date(time),
    send: async (message: { code: string }) => {
      codes.push(message.code);
    },
  };
  const verification = createEmailVerificationService(db, options);
  await verification.issue(mentor.id, "fr");
  await assert.rejects(verification.issue(mentor.id, "fr"), AuthError);
  const first = await db.emailVerification.findUniqueOrThrow({ where: { userId: mentor.id } });
  time += 61000;
  await verification.issue(mentor.id, "fr");
  const second = await db.emailVerification.findUniqueOrThrow({ where: { userId: mentor.id } });
  assert.notEqual(first.id, second.id);
  assert.equal(second.sendCount, 2);
  if (codes[0] !== codes[1])
    await assert.rejects(verification.verify(mentor.id, codes[0]), AuthError);
  const bad = codes[1] === "000000" ? "111111" : "000000";
  while (
    (await db.emailVerification.findUniqueOrThrow({ where: { userId: mentor.id } })).attempts < 5
  )
    await assert.rejects(verification.verify(mentor.id, bad), AuthError);
  await assert.rejects(verification.verify(mentor.id, codes[1]), AuthError);
  time += 61000;
  await assert.rejects(verification.issue(mentor.id, "fr"), AuthError);
  time += 16 * 60000;
  await verification.issue(mentor.id, "fr");
  const latest = codes.at(-1)!;
  time += 10 * 60000;
  await assert.rejects(verification.verify(mentor.id, latest), AuthError);
  time += 16 * 60000;
  const failed = createEmailVerificationService(db, {
    ...options,
    send: async () => {
      throw new Error("SMTP failure");
    },
  });
  await assert.rejects(failed.issue(mentor.id, "fr"), AuthError);
  assert.equal(
    (await db.emailVerification.findUniqueOrThrow({ where: { userId: mentor.id } })).deliveryStatus,
    "FAILED",
  );
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: mentor.id } })).emailVerifiedAt,
    null,
  );
});

databaseTest(
  "OTP cannot verify changed email or disabled accounts and admin reads require verification",
  async () => {
    const admin = await user("ADMIN");
    await db.user.update({
      where: { id: admin.id },
      data: { accountStatus: "PENDING_VERIFICATION", emailVerifiedAt: null },
    });
    await assert.rejects(createAdminService(db).listUsers(admin.id), expectCode("ADMIN_REQUIRED"));
    let code = "";
    const verification = createEmailVerificationService(db, {
      secret: "otp-test-secret-".repeat(4),
      send: async (message) => {
        code = message.code;
      },
    });
    await verification.issue(admin.id, "fr");
    await db.user.update({
      where: { id: admin.id },
      data: { email: `changed-${randomUUID()}@example.test` },
    });
    await assert.rejects(verification.verify(admin.id, code), AuthError);
    await db.user.update({ where: { id: admin.id }, data: { accountStatus: "SUSPENDED" } });
    await assert.rejects(verification.issue(admin.id, "fr"), AuthError);
    await assert.rejects(verification.verify(admin.id, code), AuthError);
  },
);

databaseTest("OTP resend quota and concurrent confirmation are serialized", async () => {
  const mentor = await newMentorCandidate();
  await db.user.update({
    where: { id: mentor.id },
    data: { accountStatus: "PENDING_VERIFICATION", emailVerifiedAt: null },
  });
  let time = Date.now();
  let code = "";
  const service = createEmailVerificationService(db, {
    secret: "otp-test-secret-".repeat(4),
    now: () => new Date(time),
    send: async (message) => {
      code = message.code;
    },
  });
  for (let i = 0; i < 5; i++) {
    await service.issue(mentor.id, "fr");
    time += 61000;
  }
  await assert.rejects(service.issue(mentor.id, "fr"), AuthError);
  const results = await Promise.allSettled([
    service.verify(mentor.id, code),
    service.verify(mentor.id, code),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(await db.session.count({ where: { userId: mentor.id } }), 1);
});

databaseTest(
  "mentor charter records explicit new-version consent and preserves its original date",
  async () => {
    await withMentorUploads(async (onboarding) => {
      const previous = new Date("2026-10-01T12:00:00Z");
      for (const charterVersion of [null, "earlier-summary", MENTOR_CHARTER_VERSION]) {
        const mentor = await newMentorCandidate();
        await db.mentorProfile.update({
          where: { userId: mentor.id },
          data: { charterAcceptedAt: previous, charterVersion },
        });
        await assert.rejects(
          onboarding.submit(mentor.id, { ...mentorSubmission(), charterAccepted: false }),
          /charte du mentorat/,
        );
        const unchanged = await db.mentorProfile.findUniqueOrThrow({
          where: { userId: mentor.id },
        });
        assert.equal(unchanged.charterVersion, charterVersion);
        assert.equal(unchanged.charterAcceptedAt?.getTime(), previous.getTime());
        await onboarding.submit(mentor.id, mentorSubmission());
        const accepted = await db.mentorProfile.findUniqueOrThrow({ where: { userId: mentor.id } });
        assert.equal(accepted.charterVersion, MENTOR_CHARTER_VERSION);
        if (charterVersion === MENTOR_CHARTER_VERSION)
          assert.equal(accepted.charterAcceptedAt?.getTime(), previous.getTime());
        else assert.ok(accepted.charterAcceptedAt! > previous);
      }
    });
  },
);

async function paidContribution(userId: string) {
  return db.contributionPayment.create({
    data: {
      userId,
      email: "fixture@example.test",
      locale: "fr",
      livemode: stripeLiveMode(),
      status: "PAID",
      paidAt: new Date(),
      stripeSessionId: `cs_test_${randomUUID().replaceAll("-", "")}`,
      stripePaymentIntentId: `pi_${randomUUID().replaceAll("-", "")}`,
    },
  });
}
const stripeTestEnv = {
  STRIPE_MODE: "test",
  STRIPE_SECRET_KEY: "sk_test_fixture_only",
  STRIPE_WEBHOOK_SECRET: "whsec_fixture_only",
  APP_URL: "http://localhost:3000",
};
function stripeFixture() {
  const sessions = new Map<string, Stripe.Checkout.Session>();
  const keys = new Map<string, Stripe.Checkout.Session>();
  const params: Stripe.Checkout.SessionCreateParams[] = [];
  const intents = new Map<string, Stripe.PaymentIntent>();
  let reads = 0;
  const gateway: PaymentGateway = {
    async createSession(input, key) {
      params.push(input);
      if (keys.has(key)) return keys.get(key)!;
      const id = "cs_test_" + randomUUID().replaceAll("-", "");
      const session = {
        id,
        mode: input.mode,
        livemode: false,
        amount_total: 3000,
        currency: "usd",
        client_reference_id: input.client_reference_id,
        metadata: input.metadata,
        payment_status: "unpaid",
        status: "open",
        url: "https://checkout.stripe.com/c/pay/" + id,
        payment_intent: null,
      } as Stripe.Checkout.Session;
      keys.set(key, session);
      sessions.set(id, session);
      return session;
    },
    async retrieveSession(id) {
      reads++;
      const session = sessions.get(id);
      if (!session) throw Error("missing fixture session");
      return session;
    },
    async retrievePaymentIntent(id) {
      const intent = intents.get(id);
      if (!intent) throw Error("missing fixture intent");
      return intent;
    },
  };
  const payments = createContributionService(db, { gateway, env: stripeTestEnv });
  return { payments, gateway, sessions, params, intents, reads: () => reads };
}
async function unpaidMentor() {
  const mentor = await newMentorCandidate();
  await db.contributionPayment.deleteMany({ where: { userId: mentor.id } });
  return mentor;
}
function checkoutEvent(
  session: Stripe.Checkout.Session,
  type = "checkout.session.completed",
  id = "evt_" + randomUUID(),
) {
  return { id, type, livemode: false, data: { object: session } } as unknown as Stripe.Event;
}
function settle(session: Stripe.Checkout.Session) {
  session.payment_status = "paid";
  session.status = "complete";
  session.url = null;
  session.payment_intent = "pi_" + randomUUID().replaceAll("-", "");
}

test("Stripe configuration fails closed without keys and separates test from live", () => {
  assert.throws(() => stripeConfig({}), PaymentError);
  assert.equal(stripeConfig(stripeTestEnv).live, false);
  assert.throws(() => stripeConfig({ ...stripeTestEnv, STRIPE_MODE: "live" }), PaymentError);
  assert.throws(
    () => stripeConfig({ ...stripeTestEnv, APP_URL: "https://user:secret@example.test" }),
    PaymentError,
  );
  assert.throws(
    () => stripeConfig({ ...stripeTestEnv, APP_URL: "http://example.test" }),
    PaymentError,
  );
});

databaseTest(
  "contribution checkout fixes USD 30 server-side and concurrent clicks reuse one session",
  async () => {
    const mentor = await unpaidMentor();
    const f = stripeFixture();
    assert.equal(
      mentorDestination((await createOnboardingService(db).getProfile(mentor.id))!),
      "/contribution",
    );
    const urls = await Promise.all([
      f.payments.checkout(mentor.id, "fr"),
      f.payments.checkout(mentor.id, "en"),
    ]);
    assert.equal(urls[0], urls[1]);
    assert.equal(f.sessions.size, 1);
    assert.equal(await db.contributionPayment.count({ where: { userId: mentor.id } }), 1);
    const request = f.params[0];
    assert.equal(request.mode, "payment");
    assert.equal(request.ui_mode, "hosted_page");
    assert.equal(request.line_items?.[0].price_data?.unit_amount, 3000);
    assert.equal(request.line_items?.[0].price_data?.currency, "usd");
    assert.ok(request.success_url?.startsWith("http://localhost:3000/fr/contribution/retour"));
    assert.equal((await f.payments.status(mentor.id)).paid, false);
    await withMentorUploads(async (onboarding) =>
      assert.rejects(onboarding.submit(mentor.id, mentorSubmission()), /contribution/),
    );
  },
);

databaseTest(
  "paid webhook is idempotent, permits support without documents, and never approves the mentor",
  async () => {
    const mentor = await unpaidMentor();
    const f = stripeFixture();
    await f.payments.checkout(mentor.id, "en");
    const session = [...f.sessions.values()][0];
    settle(session);
    const event = checkoutEvent(session);
    await Promise.all([f.payments.handleEvent(event), f.payments.handleEvent(event)]);
    assert.equal(await db.stripeWebhookEvent.count({ where: { id: event.id } }), 1);
    assert.equal((await f.payments.status(mentor.id)).paid, true);
    assert.equal(await f.payments.checkout(mentor.id, "fr"), null);
    assert.equal(await db.contributionPayment.count({ where: { userId: mentor.id } }), 1);
    assert.equal(await db.mentorDocument.count({ where: { mentorUserId: mentor.id } }), 0);
    const profile = await db.mentorProfile.findUniqueOrThrow({ where: { userId: mentor.id } });
    assert.equal(profile.verificationStatus, "DRAFT");
    assert.equal(await db.membership.count({ where: { mentorUserId: mentor.id } }), 0);
    await withMentorUploads(async (onboarding) => onboarding.submit(mentor.id, mentorSubmission()));
  },
);

databaseTest(
  "return reconciliation checks ownership and retrieves Stripe state instead of trusting the URL",
  async () => {
    const mentor = await unpaidMentor();
    const stranger = await unpaidMentor();
    const f = stripeFixture();
    await f.payments.checkout(mentor.id, "en");
    const session = [...f.sessions.values()][0];
    await assert.rejects(f.payments.reconcile(stranger.id, session.id), PaymentError);
    assert.equal(f.reads(), 0);
    assert.equal((await f.payments.reconcile(mentor.id, session.id)).paid, false);
    settle(session);
    assert.equal((await f.payments.reconcile(mentor.id, session.id)).paid, true);
    assert.equal(
      await db.stripeWebhookEvent.count({ where: { paymentId: session.metadata!.paymentId } }),
      0,
    );
  },
);

databaseTest(
  "expired checkout is replaced safely; completed unpaid checkout does not unlock uploads",
  async () => {
    const mentor = await unpaidMentor();
    const f = stripeFixture();
    await f.payments.checkout(mentor.id, "fr");
    const first = [...f.sessions.values()][0];
    first.status = "expired";
    first.url = null;
    await f.payments.handleEvent(checkoutEvent(first, "checkout.session.expired"));
    await f.payments.checkout(mentor.id, "fr");
    assert.equal(f.sessions.size, 2);
    const next = [...f.sessions.values()][1];
    next.status = "complete";
    next.url = null;
    await f.payments.handleEvent(checkoutEvent(next));
    assert.equal((await f.payments.status(mentor.id)).paid, false);
    await assert.rejects(f.payments.checkout(mentor.id, "fr"), /confirmation/);
    assert.equal(f.sessions.size, 2);
  },
);

databaseTest(
  "Stripe rejects wrong amount, currency, account binding and test/live mismatches",
  async () => {
    const mentor = await unpaidMentor();
    const f = stripeFixture();
    await f.payments.checkout(mentor.id, "fr");
    const session = [...f.sessions.values()][0];
    settle(session);
    for (const mutation of [
      { amount_total: 1 },
      { currency: "eur" },
      { client_reference_id: randomUUID() },
      { livemode: true },
    ]) {
      const changed = { ...session, ...mutation };
      f.sessions.set(session.id, changed);
      await assert.rejects(f.payments.handleEvent(checkoutEvent(changed)), PaymentError);
    }
    assert.equal((await f.payments.status(mentor.id)).paid, false);
    assert.equal(
      await db.stripeWebhookEvent.count({ where: { paymentId: session.metadata!.paymentId } }),
      0,
    );
  },
);

databaseTest(
  "full refunds revoke contribution access and late completed events cannot restore it",
  async () => {
    const mentor = await unpaidMentor();
    const f = stripeFixture();
    await f.payments.checkout(mentor.id, "fr");
    const session = [...f.sessions.values()][0];
    settle(session);
    await f.payments.handleEvent(checkoutEvent(session));
    const intentId = session.payment_intent as string;
    f.intents.set(intentId, {
      id: intentId,
      metadata: session.metadata,
      amount: 3000,
      currency: "usd",
      livemode: false,
      status: "succeeded",
    } as Stripe.PaymentIntent);
    function refund(amount: number) {
      return {
        id: "evt_" + randomUUID(),
        type: "charge.refunded",
        livemode: false,
        data: {
          object: {
            payment_intent: intentId,
            amount: 3000,
            amount_refunded: amount,
            currency: "usd",
            livemode: false,
          },
        },
      } as unknown as Stripe.Event;
    }
    await f.payments.handleEvent(refund(1000));
    assert.equal((await f.payments.status(mentor.id)).paid, true);
    const full = refund(3000);
    await Promise.all([f.payments.handleEvent(full), f.payments.handleEvent(full)]);
    assert.equal((await f.payments.status(mentor.id)).paid, false);
    await f.payments.handleEvent(checkoutEvent(session));
    await f.payments.handleEvent(refund(500));
    const row = await db.contributionPayment.findUniqueOrThrow({
      where: { id: session.metadata!.paymentId },
    });
    assert.equal(row.status, "REFUNDED");
    assert.equal(row.refundedAmount, 3000);
    await withMentorUploads(async (onboarding) =>
      assert.rejects(onboarding.submit(mentor.id, mentorSubmission()), /contribution/),
    );
  },
);

databaseTest(
  "Stripe checkout denies founders, unverified and suspended mentors before calling Stripe",
  async () => {
    const f = stripeFixture();
    const founder = await user("FOUNDER");
    await assert.rejects(f.payments.checkout(founder.id, "fr"), PaymentError);
    const mentor = await unpaidMentor();
    await db.user.update({ where: { id: mentor.id }, data: { emailVerifiedAt: null } });
    await assert.rejects(f.payments.checkout(mentor.id, "fr"), PaymentError);
    await db.user.update({
      where: { id: mentor.id },
      data: { emailVerifiedAt: new Date(), accountStatus: "SUSPENDED" },
    });
    await assert.rejects(f.payments.checkout(mentor.id, "fr"), PaymentError);
    assert.equal(f.sessions.size, 0);
  },
);

function passwordFixture() {
  const mails: PasswordMail[] = [];
  let timestamp = new Date();
  const links = createPasswordLinkService(db, {
    send: async (message) => {
      mails.push(message);
    },
    now: () => timestamp,
    env: { APP_URL: "https://connex.example.test" },
  });
  const token = () => {
    const match = mails.at(-1)?.text.match(/#token=([a-f0-9]{64})/);
    assert.ok(match);
    return match[1];
  };
  return {
    links,
    mails,
    token,
    setNow: (value: Date) => {
      timestamp = value;
    },
  };
}
const newPasswordInput = (token: string) => ({
  token,
  password: "new password 123",
  passwordConfirmation: "new password 123",
});

test("password link origin is canonical and requires HTTPS outside local development", () => {
  assert.equal(
    passwordLinkOrigin({ APP_URL: "http://localhost:3000", NODE_ENV: "development" }),
    "http://localhost:3000",
  );
  for (const APP_URL of [
    "",
    "http://example.test",
    "https://user:password@example.test",
    "https://example.test/path",
  ])
    assert.throws(() => passwordLinkOrigin({ APP_URL, NODE_ENV: "production" }), AuthError);
});

databaseTest(
  "password reset is single use, stores only a hash and revokes every existing session",
  async () => {
    const mentor = await user("MENTOR");
    const f = passwordFixture();
    await db.session.createMany({
      data: [
        { userId: mentor.id, tokenHash: "b".repeat(64), expiresAt: new Date(Date.now() + 100000) },
        { userId: mentor.id, tokenHash: "c".repeat(64), expiresAt: new Date(Date.now() + 100000) },
      ],
    });
    await f.links.requestReset(mentor.email, "en");
    const token = f.token();
    const stored = await db.passwordToken.findUniqueOrThrow({ where: { userId: mentor.id } });
    assert.notEqual(stored.tokenHash, token);
    assert.equal(stored.purpose, "RESET");
    assert.equal(stored.deliveryStatus, "SENT");
    assert.ok(
      f.mails[0].text.includes("https://connex.example.test/en/definir-mot-de-passe#token="),
    );
    assert.equal((await f.links.inspect(token)).purpose, "RESET");
    await assert.rejects(
      f.links.setPassword({ ...newPasswordInput(token), passwordConfirmation: "different" }),
      /identiques/,
    );
    await assert.rejects(
      f.links.setPassword({
        ...newPasswordInput(token),
        password: "short",
        passwordConfirmation: "short",
      }),
      /8 et 128/,
    );
    await f.links.setPassword(newPasswordInput(token));
    assert.equal(await db.session.count({ where: { userId: mentor.id } }), 0);
    assert.ok(
      await createAuthService(db, { mentorPreview: true }).login({
        email: mentor.email,
        password: "new password 123",
      }),
    );
    assert.equal(f.mails.length, 2);
    assert.ok(!f.mails[1].text.includes("new password 123"));
    await assert.rejects(f.links.setPassword(newPasswordInput(token)), /invalide/);
  },
);

databaseTest(
  "password links enforce expiry, replacement, account state, email binding and delivery",
  async () => {
    const mentor = await user("MENTOR");
    const f = passwordFixture();
    await f.links.requestReset(mentor.email, "fr");
    const old = f.token();
    await f.links.requestReset(mentor.email, "fr");
    const current = f.token();
    assert.notEqual(old, current);
    await assert.rejects(f.links.inspect(old), /invalide/);
    const record = await db.passwordToken.findUniqueOrThrow({ where: { userId: mentor.id } });
    f.setNow(record.expiresAt);
    await assert.rejects(f.links.inspect(current), /invalide/);
    f.setNow(new Date());
    await f.links.requestReset(mentor.email, "fr");
    const changed = f.token();
    await db.user.update({
      where: { id: mentor.id },
      data: { email: `changed-${randomUUID()}@example.test` },
    });
    await assert.rejects(f.links.setPassword(newPasswordInput(changed)), /invalide/);
    await db.user.update({
      where: { id: mentor.id },
      data: { email: mentor.email, accountStatus: "SUSPENDED" },
    });
    await assert.rejects(f.links.inspect(changed), /invalide/);
    await db.user.update({ where: { id: mentor.id }, data: { accountStatus: "ACTIVE" } });
    const failed = createPasswordLinkService(db, {
      env: { APP_URL: "https://connex.example.test" },
      send: async () => {
        throw Error("fixture");
      },
    });
    await assert.rejects(failed.requestReset(mentor.email, "fr"), AuthError);
    assert.equal(
      (await db.passwordToken.findUniqueOrThrow({ where: { userId: mentor.id } })).deliveryStatus,
      "FAILED",
    );
    await assert.rejects(f.links.inspect(changed), /invalide/);
  },
);

databaseTest(
  "password reset ignores unknown accounts and limits email floods persistently",
  async () => {
    const f = passwordFixture();
    await f.links.requestReset(`unknown-${randomUUID()}@example.test`, "fr");
    assert.equal(f.mails.length, 0);
    const mentor = await user("MENTOR");
    for (let n = 0; n < 8; n++) await f.links.requestReset(mentor.email, "fr");
    assert.equal(f.mails.length, 5);
    assert.equal(await db.passwordToken.count({ where: { userId: mentor.id } }), 1);
  },
);

databaseTest(
  "admin invitation creates a private founder and accepted link alone enables preview sign-in",
  async () => {
    const admin = await user("ADMIN");
    const f = passwordFixture();
    const email = `invite-${randomUUID()}@example.test`;
    await f.links.invite(admin.id, { email, firstName: "Invited", lastName: "Founder" }, "en");
    const token = f.token();
    const invited = await db.user.findUniqueOrThrow({
      where: { email },
      include: { roles: true, founderProfile: true, receivedInvitation: true },
    });
    assert.deepEqual(
      invited.roles.map((role) => role.role),
      ["FOUNDER"],
    );
    assert.equal(invited.emailVerifiedAt, null);
    assert.equal(invited.founderProfile?.adultConfirmedAt, null);
    assert.equal(invited.receivedInvitation?.invitedById, admin.id);
    assert.equal((await f.links.inspect(token)).purpose, "INVITATION");
    await assert.rejects(f.links.setPassword(newPasswordInput(token)), /18 ans/);
    await f.links.setPassword({ ...newPasswordInput(token), adultConfirmed: true });
    const auth = createAuthService(db, { mentorPreview: true });
    const session = await auth.login({ email, password: "new password 123" });
    assert.ok(await auth.getSession(session.token));
    const activated = await db.user.findUniqueOrThrow({
      where: { email },
      include: { founderProfile: true, receivedInvitation: true },
    });
    assert.ok(activated.emailVerifiedAt);
    assert.equal(activated.accountStatus, "ACTIVE");
    assert.ok(activated.receivedInvitation?.acceptedAt);
    assert.ok(activated.founderProfile?.adultConfirmedAt);
    const profile = await createOnboardingService(db).getProfile(invited.id);
    assert.equal(profile?.isInvitedFounder, true);
    assert.equal(profile?.isCertified, false);
    assert.equal(profile?.hasContribution, false);
    await assert.rejects(
      auth.register({
        email: `public-${randomUUID()}@example.test`,
        firstName: "Public",
        lastName: "Founder",
        password: "password123",
        passwordConfirmation: "password123",
        role: "FOUNDER",
        adultConfirmed: true,
      }),
      /réservées aux mentors/,
    );
    await db.accountInvitation.update({
      where: { userId: invited.id },
      data: { acceptedAt: null },
    });
    assert.equal(await auth.getSession(session.token), null);
  },
);

databaseTest(
  "invitations reject unauthorized actors and never replace or promote existing accounts",
  async () => {
    const admin = await user("ADMIN");
    const mentor = await user("MENTOR");
    const f = passwordFixture();
    const input = {
      email: `invite-${randomUUID()}@example.test`,
      firstName: "Invited",
      lastName: "Founder",
      role: "ADMIN",
    };
    await assert.rejects(f.links.invite(mentor.id, input, "fr"), /administrateurs/);
    assert.equal(await db.user.count({ where: { email: input.email } }), 0);
    await assert.rejects(
      f.links.invite(admin.id, { ...input, email: mentor.email }, "fr"),
      /existe déjà/,
    );
    assert.deepEqual(
      (await db.userRole.findMany({ where: { userId: mentor.id } })).map((role) => role.role),
      ["MENTOR"],
    );
    await db.userRole.delete({ where: { userId_role: { userId: admin.id, role: "ADMIN" } } });
    await assert.rejects(f.links.invite(admin.id, input, "fr"), /administrateurs/);
    assert.equal(f.mails.length, 0);
  },
);

databaseTest(
  "resending an invitation reuses the account and concurrent token consumption has one winner",
  async () => {
    const admin = await user("ADMIN");
    const f = passwordFixture();
    const input = {
      email: `invite-${randomUUID()}@example.test`,
      firstName: "Invited",
      lastName: "Founder",
    };
    await f.links.invite(admin.id, input, "fr");
    const old = f.token();
    await f.links.invite(admin.id, input, "fr");
    const token = f.token();
    assert.equal(await db.user.count({ where: { email: input.email } }), 1);
    await assert.rejects(f.links.inspect(old), AuthError);
    const results = await Promise.allSettled([
      f.links.setPassword({ ...newPasswordInput(token), adultConfirmed: true }),
      f.links.setPassword({ ...newPasswordInput(token), adultConfirmed: true }),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  },
);

databaseTest(
  "forgot password can renew an expired invitation but cannot open an ordinary founder account in preview",
  async () => {
    const admin = await user("ADMIN");
    const f = passwordFixture();
    const input = {
      email: `invite-${randomUUID()}@example.test`,
      firstName: "Invited",
      lastName: "Founder",
    };
    await f.links.invite(admin.id, input, "fr");
    await f.links.requestReset(input.email, "fr");
    assert.equal((await f.links.inspect(f.token())).purpose, "INVITATION");
    const founder = await user("FOUNDER");
    await f.links.requestReset(founder.email, "fr");
    await f.links.setPassword(newPasswordInput(f.token()));
    await assert.rejects(
      createAuthService(db, { mentorPreview: true }).login({
        email: founder.email,
        password: "new password 123",
      }),
      /pas encore ouvert/,
    );
  },
);

databaseTest(
  "public founder signup stays closed in full mode while private invitations remain available",
  async () => {
    const auth = createAuthService(db, { mentorPreview: false, founderRegistration: false });
    const email = `closed-${randomUUID()}@example.test`;
    await assert.rejects(
      auth.register({
        email,
        role: "FOUNDER",
        firstName: "Public",
        lastName: "Founder",
        password: "password123",
        passwordConfirmation: "password123",
        adultConfirmed: true,
      }),
      /invitation/,
    );
    assert.equal(await db.user.count({ where: { email } }), 0);
  },
);

async function dashboardFounder() {
  const founder = await user("FOUNDER");
  const admin = await user("ADMIN");
  await db.accountInvitation.create({
    data: { userId: founder.id, invitedById: admin.id, acceptedAt: new Date() },
  });
  return founder;
}
function projectForm(
  input: {
    title?: string;
    summary?: string;
    sector?: string;
    stage?: string;
    needs?: string[];
  } = {},
) {
  const form = new FormData();
  form.set("title", input.title ?? "A founder project");
  form.set("summary", input.summary ?? "A solution for local producers.");
  form.set("sector", input.sector ?? "Agriculture");
  form.set("stage", input.stage ?? "IDEA");
  form.set("pitchUrl", "https://example.test/pitch");
  for (const need of input.needs ?? ["Stratégie"]) form.append("supportNeeds", need);
  return form;
}

databaseTest(
  "invited founder dashboard publishes and edits one mentor-visible presentation before certification",
  async () => {
    const founder = await dashboardFounder();
    const empty = await getFounderDashboard(founder.id, db);
    assert.equal(empty.project, null);
    assert.equal(empty.certified, false);
    await saveFounderProject(founder.id, projectForm({ title: "  My first project  " }), db);
    const project = await db.project.findUniqueOrThrow({
      where: { founderUserId: founder.id },
      include: { currentRevision: true },
    });
    assert.equal(project.currentRevision?.title, "My first project");
    assert.equal(project.currentRevision?.reviewStatus, "DRAFT");
    assert.equal(project.currentRevision?.publishedAt, null);
    assert.equal(project.currentRevision?.privatePitchStorageKey, null);
    await saveFounderProject(
      founder.id,
      projectForm({ title: "My updated project", needs: ["Stratégie", "Produit et technologie"] }),
      db,
    );
    assert.equal(await db.project.count({ where: { founderUserId: founder.id } }), 1);
    assert.equal(await db.projectRevision.count({ where: { projectId: project.id } }), 1);
    const dashboard = await getFounderDashboard(founder.id, db);
    assert.equal(dashboard.project?.title, "My updated project");
    assert.equal(dashboard.project?.visible, true);
    assert.deepEqual(dashboard.project?.supportNeeds, ["Stratégie", "Produit et technologie"]);
    assert.equal(dashboard.certified, false);
    assert.equal(JSON.stringify(dashboard).includes("privatePitchStorageKey"), false);
    await assert.rejects(
      service.submitProject(founder.id, project.id),
      expectCode("CERTIFICATION_REQUIRED"),
    );
  },
);

databaseTest(
  "founder project actions ignore forged identity, publication and foreign project IDs",
  async () => {
    const owner = await dashboardFounder();
    const other = await dashboardFounder();
    const victim = await service.createProject(other.id, { title: "Another owner's project" });
    const form = projectForm();
    form.set("userId", other.id);
    form.set("projectId", victim.id);
    form.set("reviewStatus", "APPROVED");
    form.set("publishedAt", new Date().toISOString());
    form.set("privatePitchStorageKey", "forged");
    await saveFounderProject(owner.id, form, db);
    const own = await db.project.findUniqueOrThrow({
      where: { founderUserId: owner.id },
      include: { currentRevision: true },
    });
    assert.equal(own.currentRevision?.reviewStatus, "DRAFT");
    assert.equal(own.currentRevision?.privatePitchStorageKey, null);
    assert.equal(own.currentRevision?.publishedAt, null);
    assert.equal(
      (await db.projectRevision.findUniqueOrThrow({ where: { id: victim.currentRevisionId! } }))
        .title,
      "Another owner's project",
    );
  },
);

databaseTest(
  "founder project dashboard denies other roles, unverified accounts and missing majority",
  async () => {
    for (const role of ["ADMIN", "MENTOR"] as const) {
      const actor = await user(role);
      await assert.rejects(getFounderDashboard(actor.id, db), expectCode("FOUNDER_UNAVAILABLE"));
      await assert.rejects(
        saveFounderProject(actor.id, projectForm(), db),
        expectCode("FOUNDER_UNAVAILABLE"),
      );
    }
    const founder = await dashboardFounder();
    await db.user.update({ where: { id: founder.id }, data: { emailVerifiedAt: null } });
    await assert.rejects(
      saveFounderProject(founder.id, projectForm(), db),
      expectCode("FOUNDER_UNAVAILABLE"),
    );
    await db.user.update({
      where: { id: founder.id },
      data: { emailVerifiedAt: new Date(), accountStatus: "SUSPENDED" },
    });
    await assert.rejects(getFounderDashboard(founder.id, db), expectCode("FOUNDER_UNAVAILABLE"));
    await db.user.update({ where: { id: founder.id }, data: { accountStatus: "ACTIVE" } });
    await db.founderProfile.update({
      where: { userId: founder.id },
      data: { adultConfirmedAt: null },
    });
    await assert.rejects(
      saveFounderProject(founder.id, projectForm(), db),
      expectCode("FOUNDER_UNAVAILABLE"),
    );
    assert.equal(await db.project.count({ where: { founderUserId: founder.id } }), 0);
  },
);

databaseTest(
  "submitted project versions are locked against edits from the founder form",
  async () => {
    const founder = await dashboardFounder();
    await saveFounderProject(founder.id, projectForm(), db);
    const project = await db.project.findUniqueOrThrow({ where: { founderUserId: founder.id } });
    await db.projectRevision.update({
      where: { id: project.currentRevisionId! },
      data: {
        reviewStatus: "SUBMITTED",
        submittedAt: new Date(),
        privatePitchStorageKey: randomUUID(),
        pitchOriginalFilename: "fixture-pitch.pdf",
        pitchSizeBytes: BigInt(100),
        pitchChecksum: hash,
        pitchScanStatus: "CLEAN",
      },
    });
    await assert.rejects(
      saveFounderProject(founder.id, projectForm({ title: "Forbidden change" }), db),
      expectCode("PROJECT_LOCKED"),
    );
    assert.equal((await getFounderDashboard(founder.id, db)).project?.title, "A founder project");
  },
);

databaseTest("project field limits and concurrent first saves preserve one project", async () => {
  const founder = await dashboardFounder();
  for (const input of [
    { title: "x".repeat(201) },
    { summary: "x".repeat(6001) },
    { sector: "x".repeat(151) },
    { needs: Array.from({ length: 11 }, (_, i) => "need" + i) },
  ])
    await assert.rejects(
      saveFounderProject(founder.id, projectForm(input), db),
      expectCode("INVALID_INPUT"),
    );
  const results = await Promise.allSettled([
    saveFounderProject(founder.id, projectForm(), db),
    saveFounderProject(founder.id, projectForm(), db),
  ]);
  assert.ok(results.some((result) => result.status === "fulfilled"));
  assert.equal(await db.project.count({ where: { founderUserId: founder.id } }), 1);
  const project = await db.project.findUniqueOrThrow({ where: { founderUserId: founder.id } });
  assert.equal(await db.projectRevision.count({ where: { projectId: project.id } }), 1);
});
