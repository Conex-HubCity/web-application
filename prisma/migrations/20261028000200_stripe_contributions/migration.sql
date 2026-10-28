CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED');
CREATE TABLE "contribution_payments" (
  "id" UUID NOT NULL, "user_id" UUID NOT NULL,
  "amount" INTEGER NOT NULL DEFAULT 3000, "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
  "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING',
  "locale" VARCHAR(2) NOT NULL, "email" VARCHAR(254) NOT NULL,
  "livemode" BOOLEAN NOT NULL DEFAULT false,
  "stripe_session_id" VARCHAR(255), "stripe_payment_intent_id" VARCHAR(255),
  "refunded_amount" INTEGER NOT NULL DEFAULT 0,
  "paid_at" TIMESTAMPTZ(3), "refunded_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "contribution_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contribution_amount" CHECK ("amount" = 3000 AND "currency" = 'usd'),
  CONSTRAINT "contribution_refund" CHECK ("refunded_amount" BETWEEN 0 AND "amount"),
  CONSTRAINT "contribution_locale" CHECK ("locale" IN ('fr','en')),
  CONSTRAINT "contribution_paid" CHECK ("status" <> 'PAID' OR "paid_at" IS NOT NULL),
  CONSTRAINT "contribution_fully_refunded" CHECK ("status" <> 'REFUNDED' OR ("refunded_amount" = "amount" AND "refunded_at" IS NOT NULL)),
  CONSTRAINT "contribution_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "contribution_payments_stripe_session_id_key" ON "contribution_payments"("stripe_session_id");
CREATE UNIQUE INDEX "contribution_payments_stripe_payment_intent_id_key" ON "contribution_payments"("stripe_payment_intent_id");
CREATE INDEX "contribution_payments_user_id_livemode_status_idx" ON "contribution_payments"("user_id", "livemode", "status");
CREATE TABLE "stripe_webhook_events" (
  "id" VARCHAR(255) NOT NULL, "type" VARCHAR(100) NOT NULL, "payment_id" UUID NOT NULL,
  "processed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stripe_webhook_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "contribution_payments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE INDEX "stripe_webhook_events_payment_id_idx" ON "stripe_webhook_events"("payment_id");
