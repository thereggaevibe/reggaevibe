import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdType = "html_code" | "banner_upload" | "network_script";

export type AdPlacement = {
  id: string;
  slot_name: string;
  page_target: string;
  position_key: string;
  ad_type: AdType;
  content_payload: string | null;
  target_url: string | null;
  rotation_weight: number;
  is_active: boolean;
  /** Paid à la carte CPM campaign this banner belongs to, when applicable. */
  ad_order_id?: string | null;
};

const SELECT =
  "id, slot_name, page_target, position_key, ad_type, content_payload, target_url, rotation_weight, is_active, ad_order_id";

/** Pages and placement positions the ad system supports. */
export const AD_PAGES = [
  {
    value: "radio",
    label: "Radio page",
    positions: [
      { value: "above_top5", label: "Above the Top 5 @5 chart" },
      { value: "below_next_show", label: "Below the next show section" },
      { value: "below_radio_shows", label: "Below the radio shows section" },
      { value: "below_recently_played", label: "Below the recently played section" },
      { value: "below_reggae_vibe_show", label: "Below the Reggae Vibe Radio show section" },
    ],
  },
  {
    value: "visuals",
    label: "Visuals page",
    positions: [{ value: "above_visuals", label: "Above Reggae Music Visuals" }],
  },
  {
    value: "events",
    label: "Events page",
    positions: [{ value: "right_column", label: "Right side column" }],
  },
  {
    value: "magazine",
    label: "Magazine page",
    positions: [
      { value: "left_under_categories", label: "Left column under categories" },
      { value: "right_under_visuals", label: "Right column under Reggae Music Visuals" },
    ],
  },
] as const;

export type AdPageValue = (typeof AD_PAGES)[number]["value"];

export const AD_NETWORKS = [
  { value: "adsense", label: "Google AdSense" },
  { value: "dfp", label: "Google Ad Manager (DFP)" },
  { value: "medianet", label: "Media.net" },
  { value: "infolinks", label: "Infolinks" },
  { value: "custom", label: "Other network / custom script" },
] as const;

export function adPageLabel(value: string) {
  return AD_PAGES.find((page) => page.value === value)?.label ?? value;
}

export function adPositionLabel(page: string, position: string) {
  const found = AD_PAGES.find((entry) => entry.value === page);
  return found?.positions.find((entry) => entry.value === position)?.label ?? position;
}

/** Active ads for one slot — used by the public AdZoneRenderer. */
export const adSlotQuery = (pageTarget: string, positionKey: string) =>
  queryOptions({
    queryKey: ["ad-slot", pageTarget, positionKey],
    queryFn: async (): Promise<AdPlacement[]> => {
      const { data, error } = await supabase
        .from("rv_ad_placements")
        .select(SELECT)
        .eq("page_target", pageTarget)
        .eq("position_key", positionKey)
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as AdPlacement[];
    },
    staleTime: 120_000,
  });

/** Every placement, active or not — admin only (RLS gates the hidden rows). */
export const allAdPlacementsQuery = () =>
  queryOptions({
    queryKey: ["ad-placements", "all"],
    queryFn: async (): Promise<AdPlacement[]> => {
      const { data, error } = await supabase
        .from("rv_ad_placements")
        .select(SELECT)
        .order("page_target", { ascending: true })
        .order("position_key", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdPlacement[];
    },
    staleTime: 30_000,
  });

/** Uploads a banner to the private ad bucket and returns a long-lived signed URL. */
export async function uploadAdBanner(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from("ad-banners").upload(path, file, { contentType: file.type });
  if (up.error) throw up.error;
  const signed = await supabase.storage.from("ad-banners").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("Could not sign the banner URL");
  return signed.data.signedUrl;
}

/** Picks one ad from a slot using rotation_weight as the probability weight. */
export function pickWeightedAd(ads: AdPlacement[], seed?: number) {
  if (ads.length <= 1) return ads[0] ?? null;
  const total = ads.reduce((sum, ad) => sum + Math.max(ad.rotation_weight, 0), 0);
  if (total <= 0) return ads[0]!;
  let roll = (seed ?? Math.random()) * total;
  for (const ad of ads) {
    roll -= Math.max(ad.rotation_weight, 0);
    if (roll <= 0) return ad;
  }
  return ads[ads.length - 1]!;
}
