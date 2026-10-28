import { stripeClient, stripeConfig } from "@/lib/payments/config";
import { createContributionService } from "@/lib/payments/service";
import type Stripe from "stripe";
export async function POST(request: Request) {
  let client: Stripe;
  let secret: string;
  try {
    client = stripeClient();
    secret = stripeConfig().webhookSecret;
  } catch {
    return new Response("Payment service unavailable", { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature || Number(request.headers.get("content-length") ?? 0) > 1024 * 1024)
    return new Response("Invalid request", { status: 400 });
  let event: Stripe.Event;
  try {
    const payload = await request.text();
    if (Buffer.byteLength(payload) > 1024 * 1024)
      return new Response("Invalid request", { status: 400 });
    event = client.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  try {
    await createContributionService().handleEvent(event);
  } catch {
    console.error("Stripe contribution event could not be processed");
    return new Response("Processing unavailable", { status: 500 });
  }
  return Response.json({ received: true });
}
