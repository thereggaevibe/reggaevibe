import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Code2, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AD_NETWORKS,
  AD_PAGES,
  adPageLabel,
  adPositionLabel,
  allAdPlacementsQuery,
  uploadAdBanner,
  type AdPlacement,
  type AdType,
} from "@/lib/ad-placements";
import { paidCpmCampaignsQuery } from "@/lib/advertiser-queries";

type Mode = "code" | "banner";

const NETWORK_HINTS: Record<string, string> = {
  adsense: "Paste the full AdSense unit snippet, including the <script> tag from your AdSense dashboard.",
  dfp: "Paste the Google Ad Manager (DFP) GPT tag: the gpt.js script plus the slot div and display() call.",
  medianet: "Paste the Media.net ad tag with its script block exactly as generated.",
  infolinks: "Paste the Infolinks script from your publisher dashboard.",
  custom: "Paste any HTML/JavaScript ad tag. Scripts are executed when the slot renders.",
};

/** Control Room panel for creating and managing site-wide ad placements. */
export function AdManagerAdminPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(allAdPlacementsQuery());

  const [page, setPage] = useState<string>(AD_PAGES[0].value);
  const positions = useMemo(
    () => AD_PAGES.find((entry) => entry.value === page)?.positions ?? [],
    [page],
  );
  const [position, setPosition] = useState<string>(AD_PAGES[0].positions[0].value);
  const [mode, setMode] = useState<Mode>("code");
  const [network, setNetwork] = useState<string>("adsense");
  const [slotName, setSlotName] = useState("");
  const [code, setCode] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [weight, setWeight] = useState(1);
  const [active, setActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adOrderId, setAdOrderId] = useState("");
  const campaigns = useQuery(paidCpmCampaignsQuery(true));

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["ad-placements"] });
    void qc.invalidateQueries({ queryKey: ["ad-slot"] });
  }

  function selectPage(next: string) {
    setPage(next);
    const first = AD_PAGES.find((entry) => entry.value === next)?.positions[0]?.value;
    if (first) setPosition(first);
  }

  function resetForm() {
    setEditingId(null);
    setSlotName("");
    setCode("");
    setBannerUrl("");
    setTargetUrl("");
    setWeight(1);
    setAdOrderId("");
    setActive(true);
    setMode("code");
    setNetwork("adsense");
  }

  function editPlacement(ad: AdPlacement) {
    setEditingId(ad.id);
    selectPage(ad.page_target);
    setPosition(ad.position_key);
    setSlotName(ad.slot_name);
    setMode(ad.ad_type === "banner_upload" ? "banner" : "code");
    setNetwork(ad.ad_type === "network_script" ? "custom" : "adsense");
    setCode(ad.ad_type === "banner_upload" ? "" : (ad.content_payload ?? ""));
    setBannerUrl(ad.ad_type === "banner_upload" ? (ad.content_payload ?? "") : "");
    setTargetUrl(ad.target_url ?? "");
    setWeight(ad.rotation_weight);
    setActive(ad.is_active);
    setAdOrderId(ad.ad_order_id ?? "");
  }

  async function onBannerFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadAdBanner(file);
      setBannerUrl(url);
      toast.success("Banner uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload the banner");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const payload = mode === "banner" ? bannerUrl.trim() : code.trim();
    if (!slotName.trim() || !payload) {
      toast.error(mode === "banner" ? "Add a slot name and upload a banner" : "Add a slot name and the ad code");
      return;
    }
    const adType: AdType = mode === "banner" ? "banner_upload" : network === "custom" ? "html_code" : "network_script";
    const row = {
      slot_name: slotName.trim(),
      page_target: page,
      position_key: position,
      ad_type: adType,
      content_payload: payload,
      target_url: mode === "banner" ? targetUrl.trim() || null : null,
      rotation_weight: Math.max(Number(weight) || 1, 0),
      is_active: active,
      ad_order_id: adOrderId || null,
    };
    setBusy(true);
    const { error } = editingId
      ? await supabase.from("rv_ad_placements").update(row).eq("id", editingId)
      : await supabase.from("rv_ad_placements").insert(row);
    setBusy(false);
    if (error) {
      toast.error(error.message || "Could not save the placement");
      return;
    }
    toast.success(editingId ? "Placement updated" : "Placement created");
    resetForm();
    refresh();
  }

  async function patch(id: string, changes: Partial<AdPlacement>) {
    const { error } = await supabase.from("rv_ad_placements").update(changes).eq("id", id);
    if (error) {
      toast.error(error.message || "Could not update the placement");
      return;
    }
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("rv_ad_placements").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete the placement");
      return;
    }
    if (editingId === id) resetForm();
    refresh();
  }

  const grouped = useMemo(() => {
    const map = new Map<string, AdPlacement[]>();
    for (const ad of data ?? []) {
      const list = map.get(ad.page_target) ?? [];
      list.push(ad);
      map.set(ad.page_target, list);
    }
    return map;
  }, [data]);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form onSubmit={save} className="panel grid h-max gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg">{editingId ? "Edit placement" : "Create a placement"}</h2>
          {editingId && (
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              Cancel edit
            </Button>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="ad-slot-name">Slot name</Label>
          <Input
            id="ad-slot-name"
            value={slotName}
            onChange={(event) => setSlotName(event.target.value)}
            placeholder="Radio leaderboard — top"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ad-page">Target page</Label>
            <select
              id="ad-page"
              value={page}
              onChange={(event) => selectPage(event.target.value)}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              {AD_PAGES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ad-position">Placement position</Label>
            <select
              id="ad-position"
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              {positions.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Ad source</Label>
          <div className="inline-flex rounded-lg border border-border p-1">
            <button
              type="button"
              onClick={() => setMode("code")}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${mode === "code" ? "bg-gold text-background" : "text-muted-foreground"}`}
            >
              <Code2 className="size-4" /> Raw code / network script
            </button>
            <button
              type="button"
              onClick={() => setMode("banner")}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${mode === "banner" ? "bg-gold text-background" : "text-muted-foreground"}`}
            >
              <ImagePlus className="size-4" /> Banner upload
            </button>
          </div>
        </div>

        {mode === "code" ? (
          <>
            <div className="grid gap-2">
              <Label htmlFor="ad-network">Ad network</Label>
              <select
                id="ad-network"
                value={network}
                onChange={(event) => setNetwork(event.target.value)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                {AD_NETWORKS.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{NETWORK_HINTS[network]}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ad-code">Ad code</Label>
              <Textarea
                id="ad-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                rows={8}
                placeholder={'<script async src="https://pagead2.googlesyndication.com/…"></script>'}
                className="font-mono text-xs"
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-2">
              <Label htmlFor="ad-banner">Banner image</Label>
              <Input
                id="ad-banner"
                type="file"
                accept="image/*"
                onChange={(event) => onBannerFile(event.target.files?.[0])}
              />
              {bannerUrl && (
                <img src={bannerUrl} alt="Banner preview" className="mt-1 w-full rounded-lg border border-border" />
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ad-target">Target URL</Label>
              <Input
                id="ad-target"
                value={targetUrl}
                onChange={(event) => setTargetUrl(event.target.value)}
                placeholder="https://advertiser.com/landing"
              />
            </div>
          </>
        )}

        <div className="grid gap-2">
          <Label htmlFor="ad-campaign">Paid impression campaign (optional)</Label>
          <select
            id="ad-campaign"
            value={adOrderId}
            onChange={(event) => setAdOrderId(event.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="">Not tied to a purchased pool</option>
            {(campaigns.data ?? []).map((order) => (
              <option key={order.id} value={order.id}>
                {(order.buyer_email ?? "advertiser") + " — " + order.impressions.toLocaleString() + " impressions"}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Linking a banner here counts its views against that advertiser&apos;s purchased pool and feeds their
            dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-6">
          <div className="grid gap-2">
            <Label htmlFor="ad-weight">Rotation weight / priority</Label>
            <Input
              id="ad-weight"
              type="number"
              min={0}
              value={weight}
              onChange={(event) => setWeight(Number(event.target.value))}
              className="w-28"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
            <Switch checked={active} onCheckedChange={setActive} /> Slot enabled
          </label>
        </div>

        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : editingId ? "Save changes" : "Create placement"}
        </Button>
      </form>

      <div className="panel grid h-max gap-4 p-5">
        <h2 className="text-lg">Placements by page</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading placements…</p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">No ad placements yet.</p>
        ) : (
          AD_PAGES.filter((entry) => grouped.has(entry.value)).map((entry) => (
            <section key={entry.value} className="grid gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gold">{adPageLabel(entry.value)}</h3>
              <ul className="grid gap-2">
                {(grouped.get(entry.value) ?? []).map((ad) => (
                  <li key={ad.id} className="grid gap-2 rounded-xl border border-border p-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{ad.slot_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {adPositionLabel(ad.page_target, ad.position_key)} · {ad.ad_type.replace("_", " ")} · weight{" "}
                          {ad.rotation_weight}
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => editPlacement(ad)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${ad.slot_name}`}
                        onClick={() => remove(ad.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch checked={ad.is_active} onCheckedChange={(checked) => patch(ad.id, { is_active: checked })} />
                      {ad.is_active ? "Live on site" : "Disabled"}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
