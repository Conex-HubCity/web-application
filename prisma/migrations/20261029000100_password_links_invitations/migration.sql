CREATE TYPE "PasswordTokenPurpose" AS ENUM ('RESET', 'INVITATION');
CREATE TABLE "password_tokens" (
  "user_id" UUID NOT NULL, "token_hash" CHAR(64) NOT NULL, "email" VARCHAR(254) NOT NULL,
  "purpose" "PasswordTokenPurpose" NOT NULL, "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "consumed_at" TIMESTAMPTZ(3), "delivery_status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_tokens_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "password_tokens_hash_check" CHECK ("token_hash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "password_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "password_tokens_token_hash_key" ON "password_tokens"("token_hash");
CREATE TABLE "account_invitations" (
  "user_id" UUID NOT NULL, "invited_by_id" UUID NOT NULL, "accepted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_invitations_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "account_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "account_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE INDEX "account_invitations_invited_by_id_idx" ON "account_invitations"("invited_by_id");
