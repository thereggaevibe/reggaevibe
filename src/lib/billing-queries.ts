import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPaymentsEnvironment } from "@/lib/payments-client";

export type PlanId = "vip_monthly" | "vip_yearly" | "artist_store_pro_monthly";

export type Plan = {
  id: PlanId;
  name: string;
  priceLabel: string;
  cadence: string;
  audience: "listener" | "artist";
  perks: string[];
};

export const PLANS: Plan[] = [
  {
    id: "vip_monthly",
    name: "VIP Monthly",
    priceLabel: "$5",
    cadence: "per month",
    audience: "listener",
    perks: [
      "Ad-free live stream",
      "Early access to new visuals",
      "VIP badge on shout-outs",
      "Double weight on chart votes",
    ],
  },
  {
    id: "vip_yearly",
    name: "VIP Yearly",
    priceLabel: "$50",
    cadence: "per year · 2 months free",
    audience: "listener",
    perks: ["Everything in VIP Monthly", "Two months free", "Priority event flyer submissions"],
  },
  {
    id: "artist_store_pro_monthly",
    name: "Artist Store Pro",
    priceLabel: "$9.99",
    cadence: "per month",
    audience: "artist",
    perks: [
      "Station commission drops from 25% to 10%",
      "Unlimited releases in the Music store",
      "Priority placement in the marketplace",
      "Monthly sales reporting",
    ],
  },
];

export type SubscriptionRow = {
  id: string;
  price_id: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export function subscriptionQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["subscription", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<SubscriptionRow | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, price_id, status, current_period_end, cancel_at_period_end")
        .eq("user_id", userId)
        .eq("environment", getPaymentsEnvironment())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function myAdOrdersQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["ad-orders", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("ad_orders")
        .select("id, units, impressions, amount_cents, placement, status, created_at")
        .eq("buyer_user_id", userId)
        .eq("environment", getPaymentsEnvironment())
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

/** Active access includes a canceled plan that is still inside its paid period. */
export function hasAccess(sub: SubscriptionRow | null | undefined): boolean {
  if (!sub) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const inPeriod = end === null || end > Date.now();
  if (["active", "trialing", "past_due"].includes(sub.status)) return inPeriod;
  return sub.status === "canceled" && inPeriod;
}

export const PLACEMENTS = [
  { id: "magazine_banner", label: "Magazine banner" },
  { id: "visuals_preroll", label: "Visuals pre-roll" },
  { id: "on_air_spot", label: "On-air spot" },
  { id: "events_feature", label: "Events page feature" },
] as const;
