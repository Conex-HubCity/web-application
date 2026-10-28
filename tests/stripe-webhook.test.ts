import assert from "node:assert/strict";
import { test } from "node:test";
import Stripe from "stripe";
import { POST } from "../app/api/stripe/webhook/route";

test("Stripe webhook rejects missing or tampered signatures and accepts signed unrelated events without fulfilling payment", async () => {
  const keys = [
    "STRIPE_MODE",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "APP_URL",
    "DATABASE_URL",
  ] as const;
  const previous = keys.map((key) => process.env[key]);
  Object.assign(process.env, {
    STRIPE_MODE: "test",
    STRIPE_SECRET_KEY: "sk_test_signature_fixture",
    STRIPE_WEBHOOK_SECRET: "whsec_signature_fixture",
    APP_URL: "http://localhost:3000",
    DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://unused:unused@127.0.0.1:1/unused",
  });
  const client = new Stripe("sk_test_signature_fixture");
  const payload = JSON.stringify({
    id: "evt_signature_fixture",
    type: "customer.created",
    livemode: false,
    data: { object: { id: "cus_fixture" } },
  });
  const signature = client.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  function request(body: string, sig?: string) {
    return new Request("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      body,
      headers: sig ? { "stripe-signature": sig } : {},
    });
  }
  try {
    assert.equal((await POST(request(payload))).status, 400);
    assert.equal((await POST(request(payload + " ", signature))).status, 400);
    assert.equal((await POST(request(payload, signature))).status, 200);
    process.env.STRIPE_WEBHOOK_SECRET = "";
    assert.equal((await POST(request(payload, signature))).status, 503);
  } finally {
    keys.forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    });
  }
});
