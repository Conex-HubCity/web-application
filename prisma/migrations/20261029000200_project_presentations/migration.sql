CREATE TABLE "project_images" (
 "id" UUID NOT NULL, "owner_user_id" UUID NOT NULL,
 "full_storage_key" TEXT NOT NULL,"thumbnail_storage_key" TEXT NOT NULL,
 "full_checksum" CHAR(64) NOT NULL,"thumbnail_checksum" CHAR(64) NOT NULL,
 "full_width" INTEGER NOT NULL,"full_height" INTEGER NOT NULL,"full_size_bytes" INTEGER NOT NULL,
 "thumbnail_width" INTEGER NOT NULL,"thumbnail_height" INTEGER NOT NULL,"thumbnail_size_bytes" INTEGER NOT NULL,
 "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "project_images_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "project_images_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
 CONSTRAINT "project_images_dimensions" CHECK ("full_width">0 AND "full_height">0 AND "thumbnail_width">0 AND "thumbnail_height">0 AND "full_size_bytes">0 AND "thumbnail_size_bytes">0),
 CONSTRAINT "project_images_checksums" CHECK ("full_checksum" ~ '^[a-f0-9]{64}$' AND "thumbnail_checksum" ~ '^[a-f0-9]{64}$')
);
CREATE UNIQUE INDEX "project_images_full_storage_key_key" ON "project_images"("full_storage_key");
CREATE UNIQUE INDEX "project_images_thumbnail_storage_key_key" ON "project_images"("thumbnail_storage_key");
CREATE INDEX "project_images_owner_user_id_created_at_idx" ON "project_images"("owner_user_id","created_at");
ALTER TABLE "project_revisions"
 ADD COLUMN "pitch_url" VARCHAR(2048), ADD COLUMN "social_links" JSONB NOT NULL DEFAULT '[]',
 ADD COLUMN "custom_links" JSONB NOT NULL DEFAULT '[]', ADD COLUMN "presented_at" TIMESTAMPTZ(3),
 ADD COLUMN "branding_image_id" UUID;
ALTER TABLE "project_revisions" ADD CONSTRAINT "project_revisions_branding_image_id_fkey" FOREIGN KEY ("branding_image_id") REFERENCES "project_images"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "project_revisions" ADD CONSTRAINT "presentation_links_arrays" CHECK (jsonb_typeof("social_links")='array' AND jsonb_typeof("custom_links")='array');
ALTER TABLE "project_revisions" ADD CONSTRAINT "presentation_pitch_required" CHECK ("presented_at" IS NULL OR ("pitch_url" IS NOT NULL AND "pitch_url" ~ '^https?://'));
CREATE INDEX "project_presentations_idx" ON "project_revisions"("presented_at");
