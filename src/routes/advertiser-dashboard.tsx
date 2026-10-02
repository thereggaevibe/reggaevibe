import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentTestModeBanner } from "@/components/music/PaymentTestModeBanner";
import { useAuth } from "@/hooks/use-auth";
import { money } from "@/lib/music-queries";
import { PLACEMENTS } from "@/lib/billing-queries";
import { getPaymentsEnvironment } from "@/lib/payments-client";
import { createAdCheckout } from "@/lib/billing.functions";
import { findAdPackage } from "@/lib/ad-packages";
import {
  campaignByTokenQuery,
  campaignPageLabel,
  myCampaignsQuery,
  percentOf,
  remainingOf,
  type AdCampaign,
} from "@/lib/advertiser-queries";

export const Route = createFileRoute("/advertiser-dashboard")({
  head: () => ({
    meta: [
      { title: "Advertiser Dashboard — Reggae Vibe Radio" },
      {
        name: "description",
        content:
          "Track your Reggae Vibe Radio banner campaign in real time: impressions delivered, impressions remaining, pacing and page-by-page performance.",
      },
      { property: "og:title", content: "Advertiser Dashboard — Reggae Vibe Radio" },
      { property: "og:description", content: "Live impression counters and pacing for your banner campaign." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdvertiserDashboardPage,
});

const ALL_PAGES = ["radio", "magazine", "visuals", "events"];

function placementLabel(placement: string) {
  return (
    findAdPackage(placement)?.name ??
    PLACEMENTS.find((p) => p.id === placement)?.label ??
    placement
  );
}

export function CampaignCard({ campaign }: { campaign: AdCampaign }) {
  const [renewing, setRenewing] = useState(false);
  const remaining = remainingOf(campaign);
  const percent = percentOf(campaign);
  const exhausted = remaining === 0;

  const renew = async () => {
    setRenewing(true);
    try {
      const result = await createAdCheckout({
        data: {
          units: Math.max(1, Math.round(campaign.purchased / 1000)),
          placement: campaign.placement as never,
          notes: `Renewal of campaign ${campaign.order_id}`,
          environment: getPaymentsEnvironment(),
          returnUrl: `${window.location.origin}/advertise?pp_return=1`,
        },
      });
      if ("error" in result) throw new Error(result.error);
      window.location.assign(result.approveUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start PayPal checkout");
      setRenewing(false);
    }
  };

  return (
    <Card className="bg-surface">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="font-display text-2xl uppercase tracking-wide">
            {placementLabel(campaign.placement)}
          </CardTitle>
          <span
            className={`rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] ${
              exhausted ? "border-border text-muted-foreground" : "border-rasta-green/60 text-rasta-green"
            }`}
          >
            {exhausted ? "Completed" : "Active"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Started {new Date(campaign.created_at).toLocaleDateString()} · {money(campaign.amount_cents)}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold">Purchased pool</p>
            <p className="font-display text-3xl">{campaign.purchased.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold">Delivered</p>
            <p className="font-display text-3xl">{campaign.delivered.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold">Remaining</p>
            <p className="font-display text-3xl">{remaining.toLocaleString()}</p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
            <span>Pacing</span>
            <span className="text-gold">{percent}% Complete</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-background ring-1 ring-border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rasta-green via-gold to-rasta-red transition-[width] duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold">Where it is rotating</p>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {ALL_PAGES.map((page) => {
              const views = campaign.pages.find((p) => p.page_target === page)?.views ?? 0;
              return (
                <li key={page} className="flex items-center justify-between border-b border-border/60 py-1">
                  <span>{campaignPageLabel(page)}</span>
                  <span className="text-muted-foreground">{views.toLocaleString()} views</span>
                </li>
              );
            })}
          </ul>
        </div>

        {exhausted && (
          <div className="rounded-2xl border-2 border-gold/60 bg-gradient-to-br from-rasta-green/15 via-background to-rasta-red/15 p-5">
            <p className="font-display text-xl uppercase tracking-wide">Your impression pool has been fully utilized</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Buy another block to put your banner straight back into rotation.
            </p>
            <Button className="mt-4" disabled={renewing} onClick={() => void renew()}>
              {renewing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Redirecting…
                </>
              ) : (
                "Renew Campaign via PayPal"
              )}
            </Button>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          Campaign link: <span className="font-mono">?token={campaign.access_token}</span>
        </p>
      </CardContent>
    </Card>
  );
}

function AdvertiserDashboardPage() {
  const { user, loading } = useAuth();
  const [token, setToken] = useState("");
  const [activeToken, setActiveToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("token");
    if (fromUrl) {
      setToken(fromUrl);
      setActiveToken(fromUrl);
    }
  }, []);

  const mine = useQuery(myCampaignsQuery(user?.id));
  const byToken = useQuery(campaignByTokenQuery(activeToken));

  const campaigns = activeToken ? (byToken.data ?? []) : (mine.data ?? []);
  const busy = loading || mine.isLoading || byToken.isLoading;

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rasta-stripe mb-6 h-1 w-24" />
        <h1 className="flex items-center gap-3 font-display text-4xl uppercase tracking-wide sm:text-5xl">
          <BarChart3 className="text-gold" /> Advertiser Dashboard
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Live performance for your à la carte banner impression blocks — updated as views are logged across the site.
        </p>

        <Card className="mt-8 bg-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl uppercase tracking-wide">
              <KeyRound className="text-gold size-5" /> Open with a campaign token
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="grid min-w-[240px] flex-1 gap-2">
              <Label htmlFor="campaign-token">Campaign ID / token</Label>
              <Input
                id="campaign-token"
                value={token}
                onChange={(e) => setToken(e.target.value.trim())}
                placeholder="Paste the token from your receipt email"
              />
            </div>
            <Button onClick={() => setActiveToken(token || undefined)}>View campaign</Button>
            {activeToken && (
              <Button
                variant="ghost"
                onClick={() => {
                  setActiveToken(undefined);
                  setToken("");
                }}
              >
                Clear
              </Button>
            )}
          </CardContent>
        </Card>

        {!user && !activeToken && (
          <Card className="mt-6 bg-surface">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
              <p className="text-muted-foreground">Sign in to see every campaign on your account.</p>
              <Button asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 space-y-6">
          {busy && <p className="text-muted-foreground">Loading your campaign data…</p>}
          {!busy && campaigns.length === 0 && (user || activeToken) && (
            <Card className="bg-surface">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
                <p className="text-muted-foreground">No paid impression campaigns found yet.</p>
                <Button asChild>
                  <Link to="/advertise">Buy impressions</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.order_id} campaign={campaign} />
          ))}
        </div>
      </div>
    </div>
  );
}
