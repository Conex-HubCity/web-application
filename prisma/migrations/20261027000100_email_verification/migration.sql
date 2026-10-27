CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TABLE "email_verifications" (
 "user_id" UUID NOT NULL,
 "id" UUID NOT NULL,
 "email" VARCHAR(254) NOT NULL,
 "code_hash" CHAR(64) NOT NULL,
 "expires_at" TIMESTAMPTZ(3) NOT NULL,
 "attempts" INTEGER NOT NULL DEFAULT 0,
 "send_count" INTEGER NOT NULL DEFAULT 1,
 "window_started_at" TIMESTAMPTZ(3) NOT NULL,
 "last_sent_at" TIMESTAMPTZ(3) NOT NULL,
 "delivery_status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
 "consumed_at" TIMESTAMPTZ(3),
 "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("user_id"),
 CONSTRAINT "email_verifications_limits" CHECK (attempts BETWEEN 0 AND 5 AND send_count BETWEEN 1 AND 5),
 CONSTRAINT "email_verifications_email" CHECK (email = lower(btrim(email)) AND email <> ''),
 CONSTRAINT "email_verifications_hash" CHECK (code_hash ~ '^[a-f0-9]{64}$'),
 CONSTRAINT "email_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "email_verifications_id_key" ON "email_verifications"("id");
