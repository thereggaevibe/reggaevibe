import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPaymentsEnvironment } from "@/lib/payments-client";

export type CampaignPageBreakdown = { page_target: string; views: number };

export type AdCampaign = {
  order_id: string;
  created_at: string;
  placement: string;
  campaign_notes: string | null;
  amount_cents: number;
  purchased: number;
  delivered: number;
  access_token: string;
  pages: CampaignPageBreakdown[];
};

/** Friendly names for the pages a banner rotates across. */
export const CAMPAIGN_PAGE_LABELS: Record<string, string> = {
  radio: "Live Stream",
  magazine: "Magazine",
  visuals: "Visuals",
  events: "Events",
};

export function campaignPageLabel(value: string) {
  return CAMPAIGN_PAGE_LABELS[value] ?? value;
}

function normalise(rows: unknown): AdCampaign[] {
  return ((rows ?? []) as AdCampaign[]).map((row) => ({
    ...row,
    delivered: Number(row.delivered ?? 0),
    pages: (Array.isArray(row.pages) ? row.pages : []).map((p) => ({
      page_target: p.page_target,
      views: Number(p.views ?? 0),
    })),
  }));
}

export function remainingOf(campaign: AdCampaign) {
  return Math.max(campaign.purchased - campaign.delivered, 0);
}

export function percentOf(campaign: AdCampaign) {
  if (campaign.purchased <= 0) return 0;
  return Math.min(100, Math.round((campaign.delivered / campaign.purchased) * 100));
}

/** Campaigns owned by the signed-in advertiser. Live — refetched on an interval. */
export function myCampaignsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["ad-campaigns", "mine", userId],
    enabled: Boolean(userId),
    refetchInterval: 30_000,
    queryFn: async (): Promise<AdCampaign[]> => {
      const { data, error } = await supabase.rpc("my_ad_campaigns");
      if (error) throw new Error(error.message);
      return normalise(data);
    },
  });
}

/** A single campaign resolved by its secret token — no account needed. */
export function campaignByTokenQuery(token: string | undefined) {
  return queryOptions({
    queryKey: ["ad-campaigns", "token", token],
    enabled: Boolean(token && token.length >= 16),
    refetchInterval: 30_000,
    queryFn: async (): Promise<AdCampaign[]> => {
      const { data, error } = await supabase.rpc("ad_campaign_by_token", { _token: token! });
      if (error) throw new Error(error.message);
      return normalise(data);
    },
  });
}

/** Paid CPM campaigns an administrator can attach a banner placement to. */
export function paidCpmCampaignsQuery(enabled: boolean) {
  return queryOptions({
    queryKey: ["ad-orders", "paid-cpm"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_orders")
        .select("id, buyer_email, impressions, placement, created_at")
        .eq("status", "paid")
        .eq("environment", getPaymentsEnvironment())
        .gt("impressions", 0)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

const logged = new Set<string>();

/** Records one impression per banner per page view. Failures are silent by design. */
export async function logAdImpression(placementId: string) {
  if (logged.has(placementId)) return;
  logged.add(placementId);
  try {
    await supabase.rpc("log_ad_impression", { _placement_id: placementId });
  } catch {
    /* ignore — never break the page for an ad ping */
  }
}
