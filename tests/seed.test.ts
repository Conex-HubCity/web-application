import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { readAdminDocument } from "../lib/admin/documents";
import { createAuthService, hashPassword, verifyPassword } from "../lib/auth/service";
import { getMentorDashboard } from "../lib/domain/mentor-dashboard";
import { DomainError } from "../lib/domain/policies";
import {
  getFounderProjectPresentation,
  getProjectPresentation,
  listProjectPresentations,
} from "../lib/domain/project-catalogue";
import { readProjectImage } from "../lib/projects/images";
import { seedDemo } from "../prisma/seed/index";
import {
  DEFAULT_SEED_PASSWORD,
  founderAccount,
  seedAccounts,
  seedConnection,
  seedId,
} from "../prisma/seed/identity";

const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const hasDatabase = Boolean(connectionString && !connectionString.includes("CHANGE_ME"));
const databaseTest = hasDatabase ? test : test.skip;
const expectCode = (code: string) => (error: unknown) =>
  error instanceof DomainError && error.code === code;

const development: Partial<NodeJS.ProcessEnv> = {
  NODE_ENV: "development",
  STRIPE_MODE: "test",
  SEED_DATABASE_URL: "postgresql://fixture:fixture@localhost/connex_demo?schema=demo",
};

test("demo seed requires an explicit valid PostgreSQL database even with a production opt-in", () => {
  const invalidEnvironments: Partial<NodeJS.ProcessEnv>[] = [
    { ...development, SEED_DATABASE_URL: undefined },
    { ...development, SEED_DATABASE_URL: "" },
    { ...development, SEED_DATABASE_URL: "invalid-url" },
    { ...development, SEED_DATABASE_URL: "postgresql://fixture:CHANGE_ME@localhost/connex_demo" },
    { ...development, SEED_DATABASE_URL: "https://example.test/connex_demo" },
    { ...development, SEED_DATABASE_URL: "postgresql://localhost/" },
    {
      ...development,
      SEED_DATABASE_URL: "postgresql://localhost/connex_demo?schema=invalid-schema",
    },
  ];
  for (const env of invalidEnvironments) {
    assert.throws(() => seedConnection(env));
    assert.throws(() => seedConnection({ ...env, SEED_ALLOW_PRODUCTION: "true" }));
  }
  assert.throws(() => seedConnection({ DATABASE_URL: development.SEED_DATABASE_URL }));
  assert.throws(() =>
    seedConnection({ DATABASE_URL: development.SEED_DATABASE_URL, SEED_ALLOW_PRODUCTION: "true" }),
  );
  assert.deepEqual(seedConnection(development), {
    connectionString: development.SEED_DATABASE_URL,
    schema: "demo",
  });
  assert.equal(
    seedConnection({
      ...development,
      SEED_DATABASE_URL: "postgresql://fixture:fixture@localhost/connex_demo",
    }).schema,
    "public",
  );
});

test("demo seed refuses production without the exact explicit opt-in", () => {
  const productionEnvironments: Partial<NodeJS.ProcessEnv>[] = [
    { ...development, NODE_ENV: "production" },
    {
      ...development,
      SEED_DATABASE_URL: "postgresql://fixture:fixture@localhost/connex_production",
    },
    { ...development, SEED_DATABASE_URL: "postgresql://fixture:fixture@localhost/connex_%70rod" },
  ];
  for (const env of productionEnvironments) {
    for (const optIn of [undefined, "", "false", "1", "TRUE", " true "]) {
      assert.throws(() => seedConnection({ ...env, SEED_ALLOW_PRODUCTION: optIn }));
    }
  }
});

test("demo seed allows a production-named test database and production runtime with explicit opt-in", () => {
  for (const database of ["connex_production", "connex_%70rod"]) {
    const connectionString = `postgresql://fixture:fixture@localhost/${database}?schema=demo`;
    assert.deepEqual(
      seedConnection({
        ...development,
        NODE_ENV: "production",
        SEED_DATABASE_URL: connectionString,
        SEED_ALLOW_PRODUCTION: "true",
      }),
      { connectionString, schema: "demo" },
    );
  }
});

test("demo seed always refuses live Stripe payments, including with production opt-in", () => {
  for (const optIn of [undefined, "true"]) {
    assert.throws(() =>
      seedConnection({ ...development, STRIPE_MODE: "live", SEED_ALLOW_PRODUCTION: optIn }),
    );
  }
});

databaseTest(
  "demo seed supplies usable private project views and preserves work on a second import",
  { timeout: 120_000 },
  async (t) => {
    const schema = `cnx_seed_test_${randomUUID().replaceAll("-", "")}`;
    const control = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
    const resources: { pool?: pg.Pool; db?: PrismaClient; uploadsRoot?: string } = {};
    let connected = false;
    let created = false;
    const previousStripeMode = process.env.STRIPE_MODE;
    process.env.STRIPE_MODE = "test";

    t.after(async () => {
      if (previousStripeMode === undefined) delete process.env.STRIPE_MODE;
      else process.env.STRIPE_MODE = previousStripeMode;
      await resources.db?.$disconnect();
      if (resources.pool && !resources.pool.ended) await resources.pool.end();
      if (connected && created) {
        assert.match(schema, /^cnx_seed_test_[a-f0-9]{32}$/);
        await control.query("SET search_path TO public");
        await control.query(`DROP SCHEMA "${schema}" CASCADE`);
      }
      await control.end();
      if (resources.uploadsRoot) {
        assert.equal(path.dirname(resources.uploadsRoot), path.resolve(tmpdir()));
        assert.match(path.basename(resources.uploadsRoot), /^cnx-seed-test-/);
        await rm(resources.uploadsRoot, { recursive: true, force: true });
      }
    });

    await control.connect();
    connected = true;
    await control.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await control.query(`SET search_path TO "${schema}"`);
    const migrationsRoot = new URL("../prisma/migrations/", import.meta.url);
    const entries = await readdir(migrationsRoot, { withFileTypes: true });
    const migrations = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
        .map((name) => readFile(new URL(`${name}/migration.sql`, migrationsRoot), "utf8")),
    );
    const sql = migrations.join("\n").replace('CREATE SCHEMA IF NOT EXISTS "public";', "");
    assert.doesNotMatch(sql, /"public"\./);
    await control.query(sql);
    const pool = new pg.Pool({ connectionString, options: `-c search_path=${schema}`, max: 6 });
    resources.pool = pool;
    const client = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
    resources.db = client;
    const directory = await mkdtemp(path.join(tmpdir(), "cnx-seed-test-"));
    resources.uploadsRoot = directory;
    const imported = await seedDemo(client, { uploadsRoot: directory });
    assert.equal(imported.projects.length, 6);
    const first = imported.projects[0];
    const other = imported.projects[1];
    const owner = founderAccount(first.slug);

    await t.test(
      "mentor, invited founder and administrator can sign in",
      async () => {
        const auth = createAuthService(client);
        for (const account of [seedAccounts.mentor, owner, seedAccounts.admin]) {
          const login = await auth.login({ email: account.email, password: DEFAULT_SEED_PASSWORD });
          const session = await auth.getSession(login.token);
          assert.equal(session?.id, account.id);
          assert.ok(session?.emailVerifiedAt);
          assert.equal(session?.accountStatus, "ACTIVE");
        }
        const dashboard = await getMentorDashboard(seedAccounts.mentor.id, client);
        assert.ok(dashboard);
        assert.equal(dashboard.documents.length, 2);
        assert.ok(dashboard.documents.every((document) => document.status === "APPROVED"));
      },
    );

    await t.test(
      "all presentations, pitches and image variants work through application readers",
      async () => {
        const presentations = await listProjectPresentations(seedAccounts.mentor.id, client);
        assert.equal(presentations.length, imported.projects.length);
        assert.deepEqual(
          presentations.map((project) => project.id).sort(),
          imported.projects.map((project) => project.projectId).sort(),
        );
        for (const project of imported.projects) {
          const presentation = await getProjectPresentation(
            seedAccounts.mentor.id,
            project.projectId,
            client,
          );
          assert.ok(presentation);
          assert.equal(presentation.title, project.title);
          assert.ok(presentation.summary);
          assert.match(presentation.pitchUrl, /^https:\/\//);
          assert.ok(presentation.socialLinks.length > 0);
          assert.ok(presentation.customLinks.length > 0);
          assert.ok(presentation.image);
          for (const variant of ["full", "thumbnail"]) {
            const image = await readProjectImage(
              seedAccounts.mentor.id,
              project.imageId,
              variant,
              client,
              path.join(directory, "projects"),
            );
            assert.ok(image, `${project.slug}: ${variant} image is available`);
            assert.equal(image.contentType, "image/png");
            assert.equal(image.buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
            if (variant === "thumbnail") {
              assert.equal(image.width, 480);
              assert.equal(image.height, 320);
            }
          }
        }
        const preview = await getFounderProjectPresentation(owner.id, client);
        assert.equal(preview?.id, first.projectId);
        assert.equal(preview?.isOwner, true);
        assert.ok(
          await readProjectImage(
            owner.id,
            first.imageId,
            "full",
            client,
            path.join(directory, "projects"),
          ),
        );
      },
    );

    await t.test(
      "private documents and project images retain their normal access restrictions",
      async () => {
        const documents = await client.mentorDocument.findMany({
          where: { mentorUserId: seedAccounts.mentor.id },
        });
        assert.equal(documents.length, 2);
        for (const document of documents) {
          const file = await readAdminDocument(
            seedAccounts.admin.id,
            document.id,
            client,
            path.join(directory, "mentors"),
          );
          assert.equal(file.name, document.originalFilename);
          assert.ok(file.buffer.toString("ascii").startsWith("%PDF-"));
          await assert.rejects(
            readAdminDocument(
              seedAccounts.mentor.id,
              document.id,
              client,
              path.join(directory, "mentors"),
            ),
            expectCode("ADMIN_REQUIRED"),
          );
        }
        for (const account of [owner, seedAccounts.admin]) {
          await assert.rejects(
            listProjectPresentations(account.id, client),
            expectCode("CATALOGUE_FORBIDDEN"),
          );
        }
        assert.equal(
          await readProjectImage(
            owner.id,
            other.imageId,
            "full",
            client,
            path.join(directory, "projects"),
          ),
          null,
        );
      },
    );

    await t.test(
      "running the seed again preserves edits, credentials, history and row counts",
      async () => {
        async function counts() {
          const [
            users,
            projects,
            revisions,
            documents,
            decisions,
            evidenceLinks,
            contributions,
            images,
          ] = await Promise.all([
            client.user.count(),
            client.project.count(),
            client.projectRevision.count(),
            client.mentorDocument.count(),
            client.validationDecision.count(),
            client.mentorValidationDocument.count(),
            client.contributionPayment.count(),
            client.projectImage.count(),
          ]);
          return {
            users,
            projects,
            revisions,
            documents,
            decisions,
            evidenceLinks,
            contributions,
            images,
          };
        }
        const before = await counts();
        assert.equal(before.users, imported.projects.length + 2);
        assert.equal(before.projects, imported.projects.length);
        assert.equal(before.documents, 2);
        assert.equal(before.decisions, 3);
        assert.equal(before.evidenceLinks, 2);
        assert.equal(before.contributions, 1);
        assert.equal(before.images, imported.projects.length);
        const password = "Mot-de-passe-personnalise-2026!";
        const passwordHash = await hashPassword(password);
        await client.user.update({
          where: { id: seedAccounts.mentor.id },
          data: { firstName: "Mentor personnalisé", passwordHash },
        });
        await client.projectRevision.update({
          where: { id: seedId(`revision:${first.slug}`) },
          data: {
            title: "Mon projet personnalisé",
            summary: "Présentation modifiée après import.",
          },
        });
        const second = await seedDemo(client, { uploadsRoot: directory });
        assert.deepEqual(second.projects, imported.projects);
        assert.deepEqual(await counts(), before);
        const mentor = await client.user.findUniqueOrThrow({
          where: { id: seedAccounts.mentor.id },
        });
        assert.equal(mentor.firstName, "Mentor personnalisé");
        assert.equal(mentor.passwordHash, passwordHash);
        assert.equal(await verifyPassword(password, mentor.passwordHash), true);
        assert.equal(await verifyPassword(DEFAULT_SEED_PASSWORD, mentor.passwordHash), false);
        const edited = await getFounderProjectPresentation(owner.id, client);
        assert.equal(edited?.title, "Mon projet personnalisé");
        assert.equal(edited?.summary, "Présentation modifiée après import.");
        assert.ok(await getMentorDashboard(seedAccounts.mentor.id, client));
        assert.equal(
          (await listProjectPresentations(seedAccounts.mentor.id, client)).length,
          imported.projects.length,
        );
      },
    );
  },
);
