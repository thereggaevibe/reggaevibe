import type { PlanCatalogEntry } from "./billing.server";

/** PayPal REST integration. Runs only in server functions / server routes. */
export type PayPalEnv = "sandbox" | "live";

const API_BASE: Record<PayPalEnv, string> = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
};

export class PayPalError extends Error {
  status?: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "PayPalError";
    this.status = status;
  }
}

function creds(env: PayPalEnv): { clientId: string; secret: string } {
  const suffix = env === "sandbox" ? "_SANDBOX" : "";
  const clientId = process.env[`PAYPAL${suffix}_CLIENT_ID`];
  const secret = process.env[`PAYPAL${suffix}_CLIENT_SECRET`];
  if (!clientId || !secret) {
    throw new PayPalError(`PayPal is not configured for the ${env} environment yet.`);
  }
  return { clientId, secret };
}

const tokenCache = new Map<PayPalEnv, { token: string; expiresAt: number }>();

async function accessToken(env: PayPalEnv): Promise<string> {
  const cached = tokenCache.get(env);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const { clientId, secret } = creds(env);
  const res = await fetch(`${API_BASE[env]}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new PayPalError(`PayPal authentication failed [${res.status}]: ${await res.text()}`, res.status);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(env, { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 });
  return json.access_token;
}

async function paypal<T>(env: PayPalEnv, method: string, path: string, body?: unknown): Promise<T> {
  const token = await accessToken(env);
  const res = await fetch(`${API_BASE[env]}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined && { "Content-Type": "application/json" }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  if (!res.ok) throw new PayPalError(`PayPal request failed [${res.status}]: ${text}`, res.status);
  return (text ? JSON.parse(text) : null) as T;
}

export function getPayPalErrorMessage(error: unknown): string {
  if (error instanceof PayPalError) return error.message;
  if (error instanceof Error) return error.message;
  return "PayPal request failed";
}

export type PayPalLink = { rel: string; href: string };

/* ------------------------------------------------------------------ */
/* One-time payments (Orders API)                                      */
/* ------------------------------------------------------------------ */

export async function createPayPalOrder(
  env: PayPalEnv,
  opts: { amountCents: number; description: string; customId: string; returnUrl: string; cancelUrl: string },
): Promise<{ id: string; approveUrl: string }> {
  const data = await paypal<{ id: string; links: PayPalLink[] }>(env, "POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: { currency_code: "USD", value: (opts.amountCents / 100).toFixed(2) },
        description: opts.description.slice(0, 127),
        custom_id: opts.customId.slice(0, 127),
      },
    ],
    application_context: {
      brand_name: "Reggae Vibe Radio",
      locale: "en-US",
      shipping_preference: "NO_SHIPPING",
      user_action: "PAY_NOW",
      return_url: opts.returnUrl,
      cancel_url: opts.cancelUrl,
    },
  });
  return { id: data.id, approveUrl: data.links.find((l) => l.rel === "approve")?.href ?? "" };
}

export async function capturePayPalOrder(env: PayPalEnv, orderId: string) {
  try {
    return await paypal<{ status: string }>(env, "POST", `/v2/checkout/orders/${orderId}/capture`, {});
  } catch (err) {
    // Ordering twice from the return page must stay idempotent.
    const message = errorText(err);
    if (/ORDER_ALREADY_CAPTURED|CAPTURED/i.test(message)) {
      return { status: "COMPLETED" as const, alreadyCaptured: true };
    }
    throw err;
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/* ------------------------------------------------------------------ */
/* Subscriptions (Plans + Subscriptions APIs)                          */
/* ------------------------------------------------------------------ */

async function lookupStoredPlan(env: PayPalEnv, planKey: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_plans")
    .select("provider_plan_id")
    .eq("environment", env)
    .eq("plan_key", planKey)
    .maybeSingle();
  return (data as { provider_plan_id?: string } | null)?.provider_plan_id ?? null;
}

/** Creates the PayPal product + plan once per environment and caches the ids. */
export async function ensurePayPalPlan(env: PayPalEnv, plan: PlanCatalogEntry): Promise<string> {
  const existing = await lookupStoredPlan(env, plan.id);
  if (existing) return existing;

  const product = await paypal<{ id: string }>(env, "POST", "/v1/catalog/products", {
    name: `Reggae Vibe Radio — ${plan.name}`,
    type: "SERVICE",
    category: "DOWNLOADS",
  });

  const created = await paypal<{ id: string }>(env, "POST", "/v1/billing/plans", {
    product_id: product.id,
    name: plan.name,
    status: "ACTIVE",
    billing_cycles: [
      {
        frequency: { interval_unit: plan.interval, interval_count: plan.intervalCount },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: (plan.amountCents / 100).toFixed(2), currency_code: "USD" } },
      },
    ],
    payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: "CONTINUE" },
  });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("payment_plans").upsert(
    {
      environment: env,
      plan_key: plan.id,
      provider_product_id: product.id,
      provider_plan_id: created.id,
    } as never,
    { onConflict: "environment,plan_key" },
  );
  return created.id;
}

export async function findPlanKey(env: PayPalEnv, providerPlanId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_plans")
    .select("plan_key")
    .eq("environment", env)
    .eq("provider_plan_id", providerPlanId)
    .maybeSingle();
  return (data as { plan_key?: string } | null)?.plan_key ?? null;
}

export async function createPayPalSubscription(
  env: PayPalEnv,
  opts: { planId: string; userId: string; email?: string | undefined; returnUrl: string; cancelUrl: string },
): Promise<{ id: string; approveUrl: string }> {
  const data = await paypal<{ id: string; links: PayPalLink[] }>(env, "POST", "/v1/billing/subscriptions", {
    plan_id: opts.planId,
    custom_id: opts.userId.slice(0, 127),
    ...(opts.email && { subscriber: { email_address: opts.email } }),
    application_context: {
      brand_name: "Reggae Vibe Radio",
      locale: "en-US",
      user_action: "SUBSCRIBE_NOW",
      shipping_preference: "NO_SHIPPING",
      return_url: opts.returnUrl,
      cancel_url: `${opts.returnUrl.split("?")[0]}?pp_cancel=1`,
    },
  });
  return { id: data.id, approveUrl: data.links.find((l) => l.rel === "approve")?.href ?? "" };
}

export async function getPayPalSubscription(env: PayPalEnv, subscriptionId: string): Promise<any> {
  return paypal(env, "GET", `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export async function cancelPayPalSubscription(env: PayPalEnv, subscriptionId: string, reason: string): Promise<void> {
  await paypal(env, "POST", `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, { reason });
}

export async function reviseSubscriptionPlan(env: PayPalEnv, subscriptionId: string, planId: string): Promise<void> {
  await paypal(env, "PATCH", `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, [
    { op: "replace", path: "/plan_id", value: planId },
  ]);
}

/** Maps a PayPal subscription status onto the statuses the app understands. */
export function mapSubscriptionStatus(status: string | undefined): string {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "APPROVED":
      return "trialing";
    case "SUSPENDED":
      return "past_due";
    case "CANCELLED":
    case "EXPIRED":
      return "canceled";
    default:
      return status?.toLowerCase() ?? "canceled";
  }
}

/* ------------------------------------------------------------------ */
/* Webhooks                                                            */
/* ------------------------------------------------------------------ */

export async function verifyPayPalWebhook(
  env: PayPalEnv,
  headers: Headers,
  event: unknown,
): Promise<{ verified: boolean }> {
  const suffix = env === "sandbox" ? "_SANDBOX" : "";
  const webhookId = process.env[`PAYPAL${suffix}_WEBHOOK_ID`];
  if (!webhookId) throw new PayPalError(`PAYPAL${suffix}_WEBHOOK_ID is not configured`);
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const transmissionSig = headers.get("paypal-transmission-sig");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    throw new PayPalError("Missing PayPal webhook headers");
  }

  const result = await paypal<{ verification_status: string }>(
    env,
    "POST",
    "/v1/notifications/verify-webhook-signature",
    {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: event,
    },
  );
  if (result.verification_status !== "SUCCESS") throw new PayPalError("PayPal webhook signature verification failed");
  return { verified: true };
}

/* Order / subscription readers used by the return pages. */

export async function getPayPalOrder(env: PayPalEnv, orderId: string) {
  return paypal<{ id: string; status: string; purchase_units: { custom_id?: string }[] }>(
    env,
    "GET",
    `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
  );
}

/* ------------------------------------------------------------------ */
/* Merch checkout (PayPal Buttons, no redirect)                        */
/* ------------------------------------------------------------------ */

export async function createPayPalShopOrder(
  env: PayPalEnv,
  opts: {
    subtotalCents: number;
    shippingCents: number;
    totalCents: number;
    items: Array<{ name: string; quantity: number; unitCents: number }>;
    shipping: {
      name: string;
      address1: string;
      city: string;
      stateCode?: string | undefined;
      countryCode: string;
      zip: string;
    };
  },
): Promise<{ id: string }> {
  const money = (cents: number) => ({ currency_code: "USD", value: (cents / 100).toFixed(2) });
  const data = await paypal<{ id: string }>(env, "POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          ...money(opts.totalCents),
          breakdown: { item_total: money(opts.subtotalCents), shipping: money(opts.shippingCents) },
        },
        items: opts.items.map((item) => ({
          name: item.name.slice(0, 127),
          quantity: String(item.quantity),
          unit_amount: money(item.unitCents),
        })),
        shipping: {
          name: { full_name: opts.shipping.name.slice(0, 300) },
          address: {
            address_line_1: opts.shipping.address1,
            admin_area_2: opts.shipping.city,
            ...(opts.shipping.stateCode && { admin_area_1: opts.shipping.stateCode }),
            postal_code: opts.shipping.zip,
            country_code: opts.shipping.countryCode,
          },
        },
      },
    ],
    application_context: { brand_name: "Reggae Vibe Radio", locale: "en-US", user_action: "PAY_NOW" },
  });
  return { id: data.id };
}

/** Captured amount + status, used to verify a merch payment before fulfilling. */
export async function getPayPalCapture(env: PayPalEnv, orderId: string) {
  const order = await paypal<{
    status: string;
    purchase_units?: Array<{ payments?: { captures?: Array<{ status?: string; amount?: { value?: string } }> } }>;
  }>(env, "GET", `/v2/checkout/orders/${encodeURIComponent(orderId)}`);
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    orderStatus: order.status,
    captureStatus: capture?.status ?? null,
    amountCents: capture?.amount?.value ? Math.round(Number(capture.amount.value) * 100) : null,
  };
}
