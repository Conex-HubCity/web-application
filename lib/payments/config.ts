import "server-only";
import Stripe from "stripe";
export const CONTRIBUTION_AMOUNT = 3000;
export const CONTRIBUTION_CURRENCY = "usd";
export class PaymentError extends Error {}
export const stripeLiveMode = (env: Partial<NodeJS.ProcessEnv> = process.env) =>
  env.STRIPE_MODE === "live";
export function stripeConfig(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const live = stripeLiveMode(env);
  const secret = env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim();
  let origin: URL;
  try {
    origin = new URL(env.APP_URL ?? "");
  } catch {
    throw new PaymentError("Le paiement sera disponible prochainement.");
  }
  if (
    !["test", "live"].includes(env.STRIPE_MODE ?? "test") ||
    !secret?.startsWith(live ? "sk_live_" : "sk_test_") ||
    secret.includes("CHANGE_ME") ||
    !webhookSecret?.startsWith("whsec_") ||
    webhookSecret.includes("CHANGE_ME") ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    !["http:", "https:"].includes(origin.protocol) ||
    (origin.protocol !== "https:" &&
      (live || !["localhost", "127.0.0.1"].includes(origin.hostname)))
  )
    throw new PaymentError("Le paiement sera disponible prochainement.");
  return { live, secret, webhookSecret, origin: origin.origin };
}
export function stripeReady() {
  try {
    stripeConfig();
    return true;
  } catch {
    return false;
  }
}
export function stripeClient(env: Partial<NodeJS.ProcessEnv> = process.env) {
  return new Stripe(stripeConfig(env).secret, { timeout: 10000, maxNetworkRetries: 1 });
}
