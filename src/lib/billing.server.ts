/** Human-readable plan ids shared by the UI, server functions and webhooks. */
export type PlanId = "vip_monthly" | "vip_yearly" | "artist_store_pro_monthly";

export const SUBSCRIPTION_PRICES: PlanId[] = ["vip_monthly", "vip_yearly", "artist_store_pro_monthly"];

export type PlanCatalogEntry = {
  id: PlanId;
  name: string;
  amountCents: number;
  interval: "MONTH" | "YEAR";
  intervalCount: number;
};

/** Fixed price list — PayPal plans are created from these values on first use. */
export const PLAN_CATALOG: Record<PlanId, PlanCatalogEntry> = {
  vip_monthly: { id: "vip_monthly", name: "VIP Monthly", amountCents: 500, interval: "MONTH", intervalCount: 1 },
  vip_yearly: { id: "vip_yearly", name: "VIP Yearly", amountCents: 5000, interval: "YEAR", intervalCount: 1 },
  artist_store_pro_monthly: {
    id: "artist_store_pro_monthly",
    name: "Artist Store Pro",
    amountCents: 999,
    interval: "MONTH",
    intervalCount: 1,
  },
};

export function isSubscriptionPrice(value: string): value is PlanId {
  return (SUBSCRIPTION_PRICES as string[]).includes(value);
}

/** Advertising: $3 CPM, one unit = 1,000 impressions. */
export const AD_IMPRESSIONS_PER_UNIT = 1000;
export const AD_PRICE_CENTS = 300;

export const AD_PLACEMENTS = ["magazine_banner", "visuals_preroll", "on_air_spot", "events_feature"] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

/** Commission percentage an approved store pays, by active plan. */
export const DEFAULT_COMMISSION_PCT = 25;
export const PRO_COMMISSION_PCT = 10;
