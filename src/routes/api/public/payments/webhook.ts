import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { findPlanKey, verifyPayPalWebhook, type PayPalEnv } from "@/lib/paypal.server";
import { DEFAULT_COMMISSION_PCT, PRO_COMMISSION_PCT } from "@/lib/billing.server";
import { upsertSubscriptionFromPayPal } from "@/lib/billing.functions";

let cached: ReturnType<typeof createClient> | null = null;
function admin() {
  if (!cached) {
    cached = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!);
  }
  return cached;
}

async function markOrder(orderId: string, env: PayPalEnv, status: string) {
  await admin().from("music_orders").update({ status } as never).eq("provider_order_id", orderId).eq("environment", env);
}

async function markAdOrder(orderId: string, env: PayPalEnv, status: string) {
  await admin().from("ad_orders").update({ status } as never).eq("provider_order_id", orderId).eq("environment", env);
}

/** Artist Store Pro members pay a reduced station commission while their plan is live. */
async function syncStoreCommission(userId: string, planKey: string | null, active: boolean) {
  const pct = active && planKey === "artist_store_pro_monthly" ? PRO_COMMISSION_PCT : DEFAULT_COMMISSION_PCT;
  await admin().from("artist_stores").update({ commission_pct: pct } as never).eq("user_id", userId);
}

function orderIdOf(resource: any): string | null {
  return (
    resource.supplementary_data?.related_ids?.order_id ??
    resource.supplementary_data?.related_ids?.orderID ??
    resource.checkout_order_id ??
    null
  );
}

async function handleCapture(resource: any, env: PayPalEnv, status: string) {
  const orderId: string | undefined =
    resource.supplementary_data?.related_ids?.order_id ?? resource.supplementary_data?.related_ids?.order;
  if (!orderId) return;
  await markOrder(orderId, env, status);
  await markAdOrder(orderId, env, status);
}

async function endSubscriptionRow(
  subscriptionId: string,
  env: PayPalEnv,
  status: "past_due" | "canceled",
) {
  const { data: row } = await admin()
    .from("subscriptions")
    .update({ status, updated_at: new Date().toISOString() } as never)
    .eq("provider_subscription_id", subscriptionId)
    .eq("environment", env)
    .select("user_id, price_id")
    .maybeSingle();

  const userId = (row as { user_id?: string } | null)?.user_id;
  if (userId) await syncStoreCommission(userId, (row as { price_id?: string } | null)?.price_id ?? null, false);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: PayPalEnv = rawEnv;
        try {
          const event = (await request.json()) as { event_type?: string; resource?: any };
          // Signature check against PayPal itself — rejects spoofed calls.
          await verifyPayPalWebhook(env, request.headers, event);

          const resource = event.resource ?? {};
          switch (event.event_type) {
            case "PAYMENT.CAPTURE.COMPLETED": {
              const orderId = resource.supplementary_data?.related_ids?.order_id;
              if (orderId) {
                await markOrder(orderId, env, "paid");
                await markAdOrder(orderId, env, "paid");
              }
              break;
            }
            case "PAYMENT.CAPTURE.DENIED":
            case "PAYMENT.CAPTURE.DECLINED": {
              const orderId = resource.supplementary_data?.related_ids?.order_id;
              if (orderId) {
                await markOrder(orderId, env, "failed");
                await markAdOrder(orderId, env, "failed");
              }
              break;
            }
            case "PAYMENT.CAPTURE.REFUNDED":
            case "PAYMENT.CAPTURE.REVERSED": {
              const orderId = resource.supplementary_data?.related_ids?.order_id;
              if (orderId) {
                await markOrder(orderId, env, "refunded");
                await markAdOrder(orderId, env, "refunded");
              }
              break;
            }
            case "PAYMENT.SALE.COMPLETED": {
              // Recurring payment for a subscription — keep the row alive.
              const subId = resource.billing_subscription_id;
              if (subId) {
                await admin()
                  .from("subscriptions")
                  .update({ status: "active", updated_at: new Date().toISOString() } as never)
                  .eq("provider_subscription_id", subId)
                  .eq("environment", env);
              }
              break;
            }
            case "CUSTOMER.SUBSCRIPTION.ACTIVATED":
            case "CUSTOMER.SUBSCRIPTION.UPDATED": {
              const planKey = resource.plan_id ? await findPlanKey(env, resource.plan_id) : null;
              await upsertSubscriptionFromPayPal(env, resource, planKey);
              break;
            }
            case "CUSTOMER.SUBSCRIPTION.SUSPENDED":
            case "CUSTOMER.SUBSCRIPTION.PAYMENT.FAILED":
            case "CUSTOMER.SUBSCRIPTION.CANCELLED":
            case "CUSTOMER.SUBSCRIPTION.EXPIRED": {
              const status =
                event.event_type === "CUSTOMER.SUBSCRIPTION.SUSPENDED" || event.event_type === "CUSTOMER.SUBSCRIPTION.PAYMENT.FAILED"
                  ? "past_due"
                  : "canceled";
              await endSubscriptionRow(resource.id, env, status);
              break;
            }
            default:
              console.log("Unhandled PayPal event:", event.event_type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("PayPal webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
} as never);
