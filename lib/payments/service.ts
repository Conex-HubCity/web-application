import "server-only";
import type Stripe from "stripe";
import type { PrismaClient, ContributionPayment } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { localizePath, type Locale } from "@/lib/i18n/config";
import {
  CONTRIBUTION_AMOUNT,
  CONTRIBUTION_CURRENCY,
  PaymentError,
  stripeClient,
  stripeConfig,
  stripeLiveMode,
} from "./config";

export interface PaymentGateway {
  createSession(
    params: Stripe.Checkout.SessionCreateParams,
    key: string,
  ): Promise<Stripe.Checkout.Session>;
  retrieveSession(id: string): Promise<Stripe.Checkout.Session>;
  retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent>;
}
export function createContributionService(
  db: PrismaClient = getDb(),
  options: { gateway?: PaymentGateway; env?: Partial<NodeJS.ProcessEnv> } = {},
) {
  const env = options.env ?? process.env;
  function gateway(): PaymentGateway {
    if (options.gateway) return options.gateway;
    const client = stripeClient(env);
    return {
      createSession: (params, key) =>
        client.checkout.sessions.create(params, { idempotencyKey: key }),
      retrieveSession: (id) => client.checkout.sessions.retrieve(id),
      retrievePaymentIntent: (id) => client.paymentIntents.retrieve(id),
    };
  }
  async function actor(userId: string, client: Pick<PrismaClient, "user"> = db) {
    const user = await client.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        emailVerifiedAt: true,
        accountStatus: true,
        roles: { select: { role: true } },
      },
    });
    if (
      !user?.email ||
      !user.emailVerifiedAt ||
      user.accountStatus !== "ACTIVE" ||
      !user.roles.some(({ role }) => role === "MENTOR")
    )
      throw new PaymentError(
        "Cette contribution est réservée aux comptes mentors dont l’email est confirmé.",
      );
    return user;
  }
  function validSession(payment: ContributionPayment, session: Stripe.Checkout.Session) {
    if (
      session.mode !== "payment" ||
      session.livemode !== payment.livemode ||
      session.amount_total !== payment.amount ||
      session.currency !== payment.currency ||
      session.client_reference_id !== payment.userId ||
      session.metadata?.paymentId !== payment.id ||
      session.metadata?.userId !== payment.userId ||
      session.metadata?.purpose !== "connex_support" ||
      (payment.stripeSessionId && payment.stripeSessionId !== session.id)
    )
      throw new PaymentError("Le paiement n’a pas pu être vérifié.");
  }
  async function synchronize(
    session: Stripe.Checkout.Session,
    event?: { id: string; type: string },
  ) {
    const id = session.metadata?.paymentId;
    if (!id || !/^[a-f0-9-]{36}$/i.test(id)) return;
    const payment = await db.contributionPayment.findUnique({ where: { id } });
    if (!payment) return;
    validSession(payment, session);
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${payment.userId}::uuid FOR UPDATE`;
      if (event && (await tx.stripeWebhookEvent.findUnique({ where: { id: event.id } }))) return;
      const current = await tx.contributionPayment.findUniqueOrThrow({ where: { id } });
      validSession(current, session);
      const intent =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;
      if (session.payment_status === "paid" && !intent)
        throw new PaymentError("Le paiement n’a pas pu être vérifié.");
      await tx.contributionPayment.update({
        where: { id },
        data: {
          stripeSessionId: session.id,
          ...(intent ? { stripePaymentIntentId: intent } : {}),
          ...(current.status === "REFUNDED"
            ? {}
            : session.payment_status === "paid"
              ? { status: "PAID", paidAt: current.paidAt ?? new Date() }
              : current.status !== "PAID" && session.status === "expired"
                ? { status: "EXPIRED" }
                : current.status !== "PAID" &&
                    event?.type === "checkout.session.async_payment_failed"
                  ? { status: "FAILED" }
                  : {}),
        },
      });
      if (event) await tx.stripeWebhookEvent.create({ data: { ...event, paymentId: id } });
    });
  }
  const service = {
    async status(userId: string) {
      await actor(userId);
      const paid = await db.contributionPayment.findFirst({
        where: { userId, livemode: stripeLiveMode(env), status: "PAID" },
        select: { id: true },
      });
      const latest = await db.contributionPayment.findFirst({
        where: { userId, livemode: stripeLiveMode(env) },
        orderBy: { createdAt: "desc" },
        select: { status: true, paidAt: true },
      });
      return { paid: Boolean(paid), latestStatus: latest?.status ?? null };
    },
    async checkout(userId: string, locale: Locale): Promise<string | null> {
      const config = stripeConfig(env);
      if (locale !== "fr" && locale !== "en") throw new PaymentError("Demande invalide.");
      for (let attempt = 0; attempt < 2; attempt++) {
        const payment = await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
          const user = await actor(userId, tx);
          if (
            await tx.contributionPayment.findFirst({
              where: { userId, livemode: config.live, status: "PAID" },
            })
          )
            return null;
          const pending = await tx.contributionPayment.findFirst({
            where: { userId, livemode: config.live, status: "PENDING" },
            orderBy: { createdAt: "desc" },
          });
          if (pending) return pending;
          if (
            (await tx.contributionPayment.count({
              where: { userId, createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
            })) >= 5
          )
            throw new PaymentError("Trop de tentatives. Réessayez dans 15 minutes.");
          return tx.contributionPayment.create({
            data: {
              userId,
              email: user.email!,
              locale,
              livemode: config.live,
              amount: CONTRIBUTION_AMOUNT,
              currency: CONTRIBUTION_CURRENCY,
            },
          });
        });
        if (!payment) return null;
        if (
          !payment.stripeSessionId &&
          Date.now() - payment.createdAt.getTime() > 23 * 60 * 60 * 1000
        )
          throw new PaymentError(
            "Contactez l’équipe Connex pour vérifier votre précédent paiement.",
          );
        const api = gateway();
        const metadata = { paymentId: payment.id, userId, purpose: "connex_support" };
        const session = payment.stripeSessionId
          ? await api.retrieveSession(payment.stripeSessionId)
          : await api.createSession(
              {
                mode: "payment",
                allowed_payment_method_types: ["card"],
                ui_mode: "hosted_page",
                adaptive_pricing: { enabled: false },
                customer_email: payment.email,
                client_reference_id: userId,
                locale: payment.locale as Locale,
                metadata,
                payment_intent_data: { metadata },
                line_items: [
                  {
                    quantity: 1,
                    price_data: {
                      currency: CONTRIBUTION_CURRENCY,
                      unit_amount: CONTRIBUTION_AMOUNT,
                      product_data: {
                        name:
                          payment.locale === "en"
                            ? "Connex platform contribution"
                            : "Contribution au fonctionnement de Connex",
                      },
                    },
                  },
                ],
                success_url:
                  config.origin +
                  localizePath("/contribution/retour", payment.locale as Locale) +
                  "?session_id={CHECKOUT_SESSION_ID}",
                cancel_url:
                  config.origin +
                  localizePath("/contribution", payment.locale as Locale) +
                  "?cancelled=1",
              },
              `connex-contribution-${payment.id}`,
            );
        validSession(payment, session);
        await synchronize(session);
        if (session.payment_status === "paid") return null;
        if (session.status === "expired") continue;
        if (session.status !== "open" || !session.url)
          throw new PaymentError(
            "Votre paiement est en cours de confirmation. Réessayez dans un instant.",
          );
        const url = new URL(session.url);
        if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
          throw new PaymentError("Le paiement n’a pas pu être vérifié.");
        return session.url;
      }
      throw new PaymentError(
        "Votre paiement est en cours de confirmation. Réessayez dans un instant.",
      );
    },
    async reconcile(userId: string, sessionId: string) {
      await actor(userId);
      // Ownership is checked before any request to Stripe; URL parameters grant no access.
      const payment = await db.contributionPayment.findFirst({
        where: { userId, stripeSessionId: sessionId, livemode: stripeLiveMode(env) },
      });
      if (!payment) throw new PaymentError("Le paiement n’a pas pu être vérifié.");
      await synchronize(await gateway().retrieveSession(sessionId));
      return service.status(userId);
    },
    // Only call with an event verified against the webhook signature.
    async handleEvent(event: Stripe.Event) {
      if (
        ![
          "checkout.session.completed",
          "checkout.session.async_payment_succeeded",
          "checkout.session.async_payment_failed",
          "checkout.session.expired",
          "charge.refunded",
        ].includes(event.type)
      )
        return;
      if (event.livemode !== stripeLiveMode(env)) throw new PaymentError("Mode Stripe incorrect.");
      if (await db.stripeWebhookEvent.findUnique({ where: { id: event.id } })) return;
      if (
        [
          "checkout.session.completed",
          "checkout.session.async_payment_succeeded",
          "checkout.session.async_payment_failed",
          "checkout.session.expired",
        ].includes(event.type)
      ) {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.purpose !== "connex_support") return;
        await synchronize(await gateway().retrieveSession(session.id), {
          id: event.id,
          type: event.type,
        });
      } else if (event.type === "charge.refunded") {
        const charge = event.data.object as Stripe.Charge;
        const intentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (!intentId) return;
        const intent = await gateway().retrievePaymentIntent(intentId);
        const id = intent.metadata?.paymentId;
        if (intent.metadata?.purpose !== "connex_support" || !id || !/^[a-f0-9-]{36}$/i.test(id))
          return;
        const payment = await db.contributionPayment.findUnique({ where: { id } });
        if (!payment) return;
        if (
          intent.metadata.userId !== payment.userId ||
          intent.id !== intentId ||
          intent.amount !== payment.amount ||
          intent.currency !== payment.currency ||
          intent.livemode !== payment.livemode ||
          charge.livemode !== payment.livemode ||
          charge.currency !== payment.currency ||
          charge.amount !== payment.amount ||
          charge.amount_refunded < 0 ||
          charge.amount_refunded > payment.amount
        )
          throw new PaymentError("Le paiement n’a pas pu être vérifié.");
        await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM users WHERE id = ${payment.userId}::uuid FOR UPDATE`;
          if (await tx.stripeWebhookEvent.findUnique({ where: { id: event.id } })) return;
          const current = await tx.contributionPayment.findUniqueOrThrow({ where: { id } });
          const refundedAmount = Math.max(current.refundedAmount, charge.amount_refunded);
          await tx.contributionPayment.update({
            where: { id },
            data: {
              stripePaymentIntentId: intentId,
              refundedAmount,
              ...(refundedAmount === payment.amount
                ? { status: "REFUNDED", refundedAt: current.refundedAt ?? new Date() }
                : {}),
            },
          });
          await tx.stripeWebhookEvent.create({
            data: { id: event.id, type: event.type, paymentId: id },
          });
        });
      }
    },
  };
  return service;
}
