import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { adSlotQuery, pickWeightedAd, type AdPlacement } from "@/lib/ad-placements";
import { logAdImpression } from "@/lib/advertiser-queries";
import { useSubscription } from "@/hooks/use-subscription";

/** Injects raw markup and (re)executes any <script> tags it contains. */
function ScriptedAd({ html }: { html: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    node.innerHTML = html;
    const scripts = Array.from(node.querySelectorAll("script"));
    for (const original of scripts) {
      const replacement = document.createElement("script");
      for (const attr of Array.from(original.attributes)) replacement.setAttribute(attr.name, attr.value);
      replacement.text = original.textContent ?? "";
      original.replaceWith(replacement);
    }
    return () => {
      node.innerHTML = "";
    };
  }, [html]);

  return <div ref={host} className="ad-slot-embed w-full overflow-hidden" />;
}

function BannerAd({ ad }: { ad: AdPlacement }) {
  if (!ad.content_payload) return null;
  const image = (
    <img
      src={ad.content_payload}
      alt={ad.slot_name}
      loading="lazy"
      className="h-auto w-full rounded-xl border border-border object-cover"
    />
  );
  if (!ad.target_url) return image;
  return (
    <a href={ad.target_url} target="_blank" rel="noopener noreferrer sponsored" className="block no-underline">
      {image}
    </a>
  );
}

type Props = {
  pageTarget: string;
  positionKey: string;
  className?: string;
  /** Hide the zone for VIP members (ad-free perk). Defaults to true. */
  respectVip?: boolean;
};

/**
 * Renders the ad assigned to a page/position slot. Handles weighted rotation when
 * several ads share the slot, raw network scripts, and clickable banner images.
 */
export function AdZoneRenderer({ pageTarget, positionKey, className, respectVip = true }: Props) {
  const { isVip } = useSubscription();
  const { data } = useQuery(adSlotQuery(pageTarget, positionKey));

  const ad = useMemo(() => pickWeightedAd(data ?? []), [data]);
  const hidden = respectVip && isVip;

  useEffect(() => {
    if (hidden || !ad?.id) return;
    void logAdImpression(ad.id);
  }, [hidden, ad?.id]);

  if (hidden) return null;
  if (!ad || !ad.content_payload) return null;

  return (
    <aside
      aria-label="Advertisement"
      data-ad-slot={`${pageTarget}:${positionKey}`}
      className={className ?? "w-full"}
    >
      <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Advertisement</p>
      {ad.ad_type === "banner_upload" ? <BannerAd ad={ad} /> : <ScriptedAd html={ad.content_payload} />}
    </aside>
  );
}
