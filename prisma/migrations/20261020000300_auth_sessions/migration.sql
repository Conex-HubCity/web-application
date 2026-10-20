CREATE TABLE "sessions" (
  "id" UUID NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "user_id" UUID NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "sessions_expiry_check" CHECK ("expires_at" > "created_at")
);
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

CREATE TABLE "auth_throttles" (
  "key" CHAR(64) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "window_start" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "auth_throttles_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "auth_throttles_attempts_check" CHECK ("attempts" > 0)
);
