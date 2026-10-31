import { createHash } from "node:crypto";
import { mkdir, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Jimp, JimpMime } from "jimp";
import type { PrismaClient } from "../../generated/prisma/client";
import { hashPassword } from "../../lib/auth/service";
import { MENTOR_CHARTER_VERSION } from "../../lib/mentor-charter";
import { seedProjects } from "./projects";
import { DEFAULT_SEED_PASSWORD, founderAccount, seedAccounts, seedId } from "./identity";

const assetsRoot = fileURLToPath(new URL("./assets/", import.meta.url));
const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");

async function projectImage(filename: string) {
  const source = await readFile(path.join(assetsRoot, "projects", filename));
  const image = await Jimp.fromBuffer(source);
  if (image.bitmap.width * image.bitmap.height > 25_000_000)
    throw new Error(`Image de démonstration trop grande : ${filename}`);
  // Same PNG variants and contain framing as lib/projects/images.ts.
  const ratio = Math.min(1, 1800 / image.bitmap.width, 1200 / image.bitmap.height);
  if (ratio < 1) image.scale({ f: ratio });
  const content = image.clone().scaleToFit({ w: 480, h: 320 });
  const thumbnail = new Jimp({ width: 480, height: 320, color: 0xf5f3e9ff });
  thumbnail.composite(
    content,
    Math.floor((480 - content.bitmap.width) / 2),
    Math.floor((320 - content.bitmap.height) / 2),
  );
  return {
    full: await image.getBuffer(JimpMime.png),
    thumbnail: await thumbnail.getBuffer(JimpMime.png),
    width: image.bitmap.width,
    height: image.bitmap.height,
  };
}

/** No emails, Stripe calls, or real certifications; only namespace-owned demo records. */
export async function seedDemo(
  db: PrismaClient,
  options: { password?: string; uploadsRoot?: string } = {},
) {
  const password = options.password ?? DEFAULT_SEED_PASSWORD;
  if (password.length < 12 || password.length > 128)
    throw new Error("SEED_PASSWORD doit contenir entre 12 et 128 caractères.");
  const uploadsRoot = options.uploadsRoot ?? path.join(process.cwd(), "uploads", "private");
  const passwordHash = await hashPassword(password);
  // Prepare everything before the transaction: a missing source cannot leave partial accounts.
  const images = await Promise.all(
    seedProjects.map((project) => projectImage(project.image.filename)),
  );
  const documents = await Promise.all(
    ["mentor-demo-cv.pdf", "mentor-demo-experience.pdf"].map(async (filename) => ({
      filename,
      id: seedId(`document:${filename}`),
      bytes: await readFile(path.join(assetsRoot, "documents", filename)),
    })),
  );
  const createdFiles: string[] = [];
  const directories = new Set<string>();
  async function ensureFile(destination: string, bytes: Buffer) {
    const directory = path.dirname(destination);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    directories.add(directory);
    try {
      await writeFile(destination, bytes, { flag: "wx", mode: 0o600 });
      createdFiles.push(destination);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (sha256(await readFile(destination)) !== sha256(bytes))
        throw new Error("Un fichier existant diffère du seed. Aucun fichier n’a été remplacé.");
    }
  }
  try {
    await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('connex-demo-seed-v1'))`;
        // Refuse collisions rather than attaching a demo project to someone else's account.
        const accounts = [
          seedAccounts.admin,
          seedAccounts.mentor,
          ...seedProjects.map((p) => founderAccount(p.slug)),
        ];
        for (const account of accounts) {
          const existing = await tx.user.findFirst({
            where: { OR: [{ id: account.id }, { email: account.email }] },
            select: { id: true, email: true },
          });
          if (existing && (existing.id !== account.id || existing.email !== account.email))
            throw new Error(`Le compte ${account.email} existe hors du seed ; import annulé.`);
        }
        const now = new Date();
        const before = (days: number) => new Date(now.getTime() - days * 86_400_000);
        await tx.user.upsert({
          where: { id: seedAccounts.admin.id },
          update: {},
          create: {
            ...seedAccounts.admin,
            firstName: "Camille",
            lastName: "Démo CNX",
            passwordHash,
            accountStatus: "ACTIVE",
            emailVerifiedAt: before(35),
            roles: { create: { role: "ADMIN" } },
          },
        });
        await tx.user.upsert({
          where: { id: seedAccounts.mentor.id },
          update: {},
          create: {
            ...seedAccounts.mentor,
            firstName: "Aïssatou",
            lastName: "Diallo Démo",
            passwordHash,
            accountStatus: "ACTIVE",
            emailVerifiedAt: before(30),
            roles: { create: { role: "MENTOR" } },
            mentorProfile: {
              create: {
                professionalTitle: "Conseillère stratégie et croissance — profil fictif",
                biography:
                  "COMPTE FICTIF DE DÉMONSTRATION. Aïssatou accompagne, dans ce scénario, des équipes africaines sur leur modèle économique, leurs partenariats et leur développement commercial. Basée à Paris, elle anime des séances à distance en français et en anglais. Ce profil ne représente aucune personne réelle.",
                countryCode: "FR",
                city: "Paris",
                languages: ["Français", "Anglais"],
                expertise: [
                  "Stratégie",
                  "Modèle économique",
                  "Développement commercial",
                  "Financement",
                ],
                preferredSectors: [
                  "Agriculture et alimentation",
                  "Énergie",
                  "Économie circulaire",
                  "Éducation",
                  "Santé",
                  "Services financiers",
                ],
                preferredCountryCodes: ["SN", "NG", "KE", "TZ"],
                availability:
                  "Scénario démo : deux séances de 60 minutes par mois, le mardi ou jeudi.",
                motivations:
                  "Profil fictif pour explorer les vues mentor, les filtres du catalogue et les fiches projets.",
                verificationStatus: "APPROVED",
                submittedAt: before(29),
                charterVersion: MENTOR_CHARTER_VERSION,
                charterAcceptedAt: before(30),
                visibilityPreference: "PLATFORM",
                visibilityRequestedAt: before(28),
              },
            },
          },
        });
        for (const [index, document] of documents.entries()) {
          await ensureFile(path.join(uploadsRoot, "mentors", document.id), document.bytes);
          await tx.mentorDocument.upsert({
            where: { id: document.id },
            update: {},
            create: {
              id: document.id,
              mentorUserId: seedAccounts.mentor.id,
              documentType: index === 0 ? "CV" : "WORK_REFERENCE",
              originalFilename: document.filename,
              privateStorageKey: `mentors/${document.id}`,
              mimeType: "application/pdf",
              sizeBytes: BigInt(document.bytes.length),
              checksum: sha256(document.bytes),
              scanStatus: "CLEAN",
              reviewStatus: "APPROVED",
              uploadedAt: before(29),
            },
          });
          await tx.validationDecision.upsert({
            where: { id: seedId(`approval:${document.filename}`) },
            update: {},
            create: {
              id: seedId(`approval:${document.filename}`),
              reviewerUserId: seedAccounts.admin.id,
              mentorDocumentId: document.id,
              outcome: "APPROVED",
              reason:
                "SEED DÉMO : approbation et contrôle simulés, justificatif fictif sans valeur professionnelle.",
              decidedAt: before(28),
            },
          });
        }
        const decisionId = seedId("approval:mentor");
        await tx.validationDecision.upsert({
          where: { id: decisionId },
          update: {},
          create: {
            id: decisionId,
            reviewerUserId: seedAccounts.admin.id,
            mentorUserId: seedAccounts.mentor.id,
            outcome: "APPROVED",
            reason: "SEED DÉMO : compte fictif prêt aux tests d’interface, validation simulée.",
            decidedAt: before(27),
          },
        });
        for (const document of documents)
          await tx.mentorValidationDocument.upsert({
            where: { decisionId_mentorDocumentId: { decisionId, mentorDocumentId: document.id } },
            update: {},
            create: {
              decisionId,
              mentorDocumentId: document.id,
              mentorUserId: seedAccounts.mentor.id,
            },
          });
        await tx.contributionPayment.upsert({
          where: { id: seedId("contribution:mentor") },
          update: {},
          create: {
            id: seedId("contribution:mentor"),
            userId: seedAccounts.mentor.id,
            email: seedAccounts.mentor.email,
            amount: 3000,
            currency: "usd",
            status: "PAID",
            locale: "fr",
            livemode: false,
            // No invented Stripe session/event: this is a local fixture, not a gateway transaction.
            paidAt: before(29),
          },
        });
        await tx.membership.upsert({
          where: { id: seedId("membership:mentor") },
          update: {},
          create: {
            id: seedId("membership:mentor"),
            mentorUserId: seedAccounts.mentor.id,
            status: "ACTIVE",
            startsAt: before(27),
            endsAt: new Date(now.getTime() + 3650 * 86_400_000),
            // Long-lived fixture also permits exploring legacy membership-based services.
          },
        });
        for (const [index, project] of seedProjects.entries()) {
          const account = founderAccount(project.slug);
          await tx.user.upsert({
            where: { id: account.id },
            update: {},
            create: {
              ...account,
              firstName: project.founder.firstName,
              lastName: project.founder.lastName,
              passwordHash,
              accountStatus: "ACTIVE",
              emailVerifiedAt: before(20),
              roles: { create: { role: "FOUNDER" } },
              receivedInvitation: {
                create: { invitedById: seedAccounts.admin.id, acceptedAt: before(20) },
              },
              founderProfile: {
                create: {
                  biography: project.founder.biography,
                  countryCode: project.countryCode,
                  city: project.city,
                  sector: project.sector,
                  languages:
                    project.countryCode === "SN"
                      ? ["Français", "Anglais"]
                      : ["Anglais", "Français"],
                  skills: project.founder.skills,
                  availability:
                    "Scénario de démonstration : une séance de travail toutes les deux semaines.",
                  adultConfirmedAt: before(20),
                },
              },
            },
          });
          const imageId = seedId(`image:${project.slug}`);
          const image = images[index];
          await ensureFile(path.join(uploadsRoot, "projects", imageId, "full.png"), image.full);
          await ensureFile(
            path.join(uploadsRoot, "projects", imageId, "thumbnail.png"),
            image.thumbnail,
          );
          await tx.projectImage.upsert({
            where: { id: imageId },
            update: {},
            create: {
              id: imageId,
              ownerUserId: account.id,
              fullStorageKey: `projects/${imageId}/full.png`,
              thumbnailStorageKey: `projects/${imageId}/thumbnail.png`,
              fullChecksum: sha256(image.full),
              thumbnailChecksum: sha256(image.thumbnail),
              fullSizeBytes: image.full.length,
              thumbnailSizeBytes: image.thumbnail.length,
              fullWidth: image.width,
              fullHeight: image.height,
              thumbnailWidth: 480,
              thumbnailHeight: 320,
            },
          });
          const projectId = seedId(`project:${project.slug}`);
          const revisionId = seedId(`revision:${project.slug}`);
          const existingProject = await tx.project.findUnique({
            where: { id: projectId },
            select: { id: true },
          });
          if (!existingProject) {
            await tx.project.create({ data: { id: projectId, founderUserId: account.id } });
            await tx.projectRevision.create({
              data: {
                id: revisionId,
                projectId,
                revisionNumber: 1,
                title: project.title,
                summary: project.summary,
                sector: project.sector,
                stage: project.stage,
                market: project.market,
                impact: project.impact,
                team: project.team,
                risks: project.risks,
                supportNeeds: project.supportNeeds,
                pitchUrl: project.pitchUrl,
                socialLinks: project.socialLinks,
                customLinks: project.customLinks,
                brandingImageId: imageId,
                // Native presentation state: visible to mentors, still editable by its owner.
                reviewStatus: "DRAFT",
                presentedAt: before(index + 1),
              },
            });
            await tx.project.update({
              where: { id: projectId },
              data: { currentRevisionId: revisionId },
            });
          }
        }
      },
      { maxWait: 10000, timeout: 60000 },
    );
  } catch (error) {
    // Only remove files this failed run created; existing records/files are never reset.
    await Promise.allSettled(createdFiles.map((filename) => unlink(filename)));
    for (const directory of directories) await rmdir(directory).catch(() => undefined);
    throw error;
  }
  return {
    admin: seedAccounts.admin,
    mentor: seedAccounts.mentor,
    projects: seedProjects.map((project) => ({
      slug: project.slug,
      title: project.title,
      founder: founderAccount(project.slug),
      projectId: seedId(`project:${project.slug}`),
      imageId: seedId(`image:${project.slug}`),
    })),
  };
}
