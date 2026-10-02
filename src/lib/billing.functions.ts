import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type PayPalEnv,
  capturePayPalOrder,
  cancelPayPalSubscription,
  createPayPalOrder,
  createPayPalSubscription,
  ensurePayPalPlan,
  findPlanKey,
  getPayPalErrorMessage,
  getPayPalSubscription,
  mapSubscriptionStatus,
  reviseSubscriptionPlan,
} from "@/lib/paypal.server";
import {
  AD_IMPRESSIONS_PER_UNIT,
  AD_PLACEMENTS,
  AD_PRICE_CENTS,
  PLAN_CATALOG,
  type AdPlacement,
  type PlanId,
  isSubscriptionPrice,
  DEFAULT_COMMISSION_PCT,
  PRO_COMMISSION_PCT,
} from "@/lib/billing.server";
import { findAdPackage } from "@/lib/ad-packages";

type CheckoutResult = { approveUrl: string } | { error: string };
type SimpleResult = { ok: true } | { error: string };
type PlanChangeResult = { effective: "immediate" } | { error: string };

function envOf(value: string): PayPalEnv {
  if (value !== "sandbox" && value !== "live") throw new Error("Invalid environment");
  return value;
}

/** Starts a PayPal subscription checkout for a membership or artist-store plan. */
export const createSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { priceId: string; returnUrl: string; environment: string }) => {
    if (!isSubscriptionPrice(data.priceId)) throw new Error("Unknown plan");
    return { ...data, environment: envOf(data.environment) };
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      return { error: "You already have an active plan. Use “Change plan” instead." };
    }

    try {
      const entry = PLAN_CATALOG[data.priceId as PlanId];
      const providerPlanId = await ensurePayPalPlan(data.environment, entry);
      const result = await createPayPalSubscription(data.environment, {
        planId: providerPlanId,
        userId,
        email: user?.email,
        returnUrl: data.returnUrl,
        cancelUrl: `${data.returnUrl.split("?")[0]}?pp_cancel=1`,
      });
      return { approveUrl: result.approveUrl };
    } catch (err) {
      return { error: getPayPalErrorMessage(err) };
    }
  });

/** Starts a PayPal order for advertising impressions ($3 CPM, 1 unit = 1,000 impressions). */
export const createAdCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      units: number;
      placement: AdPlacement;
      notes?: string;
      returnUrl: string;
      environment: string;
    }) => {
      if (!Number.isInteger(data.units) || data.units < 1 || data.units > 1000) {
        throw new Error("Choose between 1 and 1,000 units of 1,000 impressions");
      }
      if (!(AD_PLACEMENTS as readonly string[]).includes(data.placement)) throw new Error("Unknown placement");
      return { ...data, environment: envOf(data.environment) };
    },
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    try {
      const amountCents = AD_PRICE_CENTS * data.units;
      const impressions = data.units * AD_IMPRESSIONS_PER_UNIT;
      const order = await createPayPalOrder(data.environment, {
        amountCents,
        description: `Reggae Vibe ad campaign — ${impressions.toLocaleString()} impressions`,
        customId: userId,
        returnUrl: data.returnUrl,
        cancelUrl: `${data.returnUrl.split("?")[0]}?pp_cancel=1`,
      });

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("ad_orders").insert({
        buyer_user_id: userId,
        buyer_email: user?.email ?? null,
        units: data.units,
        impressions,
        amount_cents: amountCents,
        placement: data.placement,
        campaign_notes: data.notes?.slice(0, 2000) ?? null,
        status: "pending",
        provider_order_id: order.id,
        environment: data.environment,
      });

      return { approveUrl: order.approveUrl };
    } catch (err) {
      return { error: getPayPalErrorMessage(err) };
    }
  });

/** Starts a PayPal order for one of the three-month advertising packages. */
export const createAdPackageCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { packageId: string; notes?: string; returnUrl: string; environment: string }) => {
    if (!findAdPackage(data.packageId)) throw new Error("Unknown package");
    return { ...data, environment: envOf(data.environment) };
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    const pkg = findAdPackage(data.packageId)!;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    try {
      const order = await createPayPalOrder(data.environment, {
        amountCents: pkg.priceCents,
        description: `Reggae Vibe Radio — ${pkg.name} (${pkg.cadence})`,
        customId: userId,
        returnUrl: data.returnUrl,
        cancelUrl: `${data.returnUrl.split("?")[0]}?pp_cancel=1`,
      });

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("ad_orders").insert({
        buyer_user_id: userId,
        buyer_email: user?.email ?? null,
        units: 1,
        impressions: 0,
        amount_cents: pkg.priceCents,
        placement: pkg.id,
        campaign_notes: data.notes?.slice(0, 2000) ?? null,
        status: "pending",
        provider_order_id: order.id,
        environment: data.environment,
      });

      return { approveUrl: order.approveUrl };
    } catch (err) {
      return { error: getPayPalErrorMessage(err) };
    }
  });

/** Deletes only an unpaid advertising order owned by the signed-in user. */
export const deleteMyPendingAdOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.orderId)) {
      throw new Error("Invalid campaign");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<SimpleResult> => {
    const { error, count } = await context.supabase
      .from("ad_orders")
      .delete({ count: "exact" })
      .eq("id", data.orderId)
      .eq("buyer_user_id", context.userId)
      .eq("status", "pending");

    if (error) return { error: "Could not delete this pending campaign" };
    if (count !== 1) return { error: "Only your pending campaigns can be deleted" };
    return { ok: true };
  });

/** Called from the PayPal return page for one-time payments (ads + music). */
export const finalizeOrderReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { token: string; environment: string }) => ({
    token: data.token,
    environment: envOf(data.environment),
  }))
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase, userId } = context;
    try {
      const capture = await capturePayPalOrder(data.environment, data.token);
      if (capture.status !== "COMPLETED") return { error: `PayPal reported order status ${capture.status}` };

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("music_orders")
        .update({ status: "paid", } as never)
        .eq("provider_order_id", data.token)
        .eq("buyer_user_id", userId)
        .eq("environment", data.environment);
      await supabaseAdmin
        .from("ad_orders")
        .update({ status: "paid", } as never)
        .eq("provider_order_id", data.token)
        .eq("buyer_user_id", userId)
        .eq("environment", data.environment);
      return { ok: true };
    } catch (err) {
      return { error: getPayPalErrorMessage(err) };
    }
  });

/** Called from the PayPal return page after a subscription approval. */
export const finalizeSubscriptionReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { token: string; environment: string }) => ({
    token: data.token,
    environment: envOf(data.environment),
  }))
  .handler(async ({ data, context }): Promise<SimpleResult> => {
    try {
      const sub = await getPayPalSubscription(data.environment, data.token);
      if (sub?.custom_id && sub.custom_id !== context.userId) {
        return { error: "This subscription belongs to another account" };
      }
      const planKey = sub?.plan_id ? await findPlanKey(data.environment, sub.plan_id) : null;
      await upsertSubscriptionFromPayPal(data.environment, sub, planKey);
      return { ok: true };
    } catch (err) {
      return { error: getPayPalErrorMessage(err) };
    }
  });

/** Cancels the signed-in user's active plan at PayPal. Benefits stay until period end. */
export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: string }) => ({ environment: envOf(data.environment) }))
  .handler(async ({ data, context }): Promise<SimpleResult> => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("provider_subscription_id")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.provider_subscription_id) return { error: "No active plan to cancel" };

    try {
      await cancelPayPalSubscription(data.environment, sub.provider_subscription_id, "Canceled by member");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "canceled", } as never)
        .eq("provider_subscription_id", sub.provider_subscription_id);
      return { ok: true };
    } catch (err) {
      return { error: getPayPalErrorMessage(err) };
    }
  });

/** Switch the active plan. PayPal applies plan changes immediately. */
export const changeSubscriptionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { priceId: string; environment: string }) => {
    if (!isSubscriptionPrice(data.priceId)) throw new Error("Unknown plan");
    return { priceId: data.priceId, environment: envOf(data.environment) };
  })
  .handler(async ({ data, context }): Promise<{ effective: "immediate" } | { error: string }> => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("provider_subscription_id")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.provider_subscription_id) return { error: "No active plan to change" };

    try {
      const providerPlanId = await ensurePayPalPlan(data.environment, PLAN_CATALOG[data.priceId]);
      await reviseSubscriptionPlan(data.environment, sub.provider_subscription_id, providerPlanId);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("subscriptions")
        .update({ price_id: data.priceId, } as never)
        .eq("provider_subscription_id", sub.provider_subscription_id);
      return { effective: "immediate" };
    } catch (err) {
      return { error: getPayPalErrorMessage(err) };
    }
  });

export async function upsertSubscriptionFromPayPal(
  env: PayPalEnv,
  subscription: any,
  planKey: string | null,
): Promise<void> {
  const userId = subscription.custom_id;
  if (!userId) {
    console.error("PayPal subscription without custom_id:", subscription.id);
    return;
  }
  const active = ["active", "trialing", "past_due"].includes(mapSubscriptionStatus(subscription.status));
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: userId,
      provider_subscription_id: subscription.id,
      price_id: planKey,
      status: mapSubscriptionStatus(subscription.status),
      current_period_start: subscription.start_time ?? null,
      current_period_end: subscription.billing_info?.next_billing_time ?? null,
      cancel_at_period_end: subscription.status === "CANCELLED",
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "provider_subscription_id" },
  );

  if (userId) {
    const pct = active && planKey === "artist_store_pro_monthly" ? PRO_COMMISSION_PCT : DEFAULT_COMMISSION_PCT;
    await supabaseAdmin.from("artist_stores").update({ commission_pct: pct } as never).eq("user_id", userId);
  }
}
