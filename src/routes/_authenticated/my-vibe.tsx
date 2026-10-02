import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, CalendarPlus, ChevronRight, Disc3, LogOut, Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { myCampaignsQuery } from "@/lib/advertiser-queries";
import { myAdOrdersQuery, PLACEMENTS } from "@/lib/billing-queries";
import { createAdCheckout, deleteMyPendingAdOrder, finalizeOrderReturn } from "@/lib/billing.functions";
import { findAdPackage } from "@/lib/ad-packages";
import { money } from "@/lib/music-queries";
import { getPaymentsEnvironment } from "@/lib/payments-client";
import { CampaignCard } from "@/routes/advertiser-dashboard";

type Placement = (typeof PLACEMENTS)[number]["id"];
const UNIT_PRICE_CENTS = 300;

export const Route = createFileRoute("/_authenticated/my-vibe")({
  head: () => ({
    meta: [
      { title: "My Vibe — Member Hub | Reggae Vibe Radio" },
      { name: "description", content: "Manage your artist store, event submissions and advertising campaigns." },
      { property: "og:title", content: "My Vibe — Reggae Vibe Radio" },
      { property: "og:description", content: "Manage your artist store, event submissions and advertising campaigns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyVibePage,
});

function MyVibePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const deletePendingOrder = useServerFn(deleteMyPendingAdOrder);
  const [units, setUnits] = useState(10);
  const [placement, setPlacement] = useState<Placement>("magazine_banner");
  const [notes, setNotes] = useState("");
  const [buying, setBuying] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const campaigns = useQuery(myCampaignsQuery(user?.id));
  const orders = useQuery(myAdOrdersQuery(user?.id));
  const safeUnits = Math.min(1000, Math.max(1, Math.floor(units) || 1));
  const total = safeUnits * UNIT_PRICE_CENTS;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!params.get("pp_return") || !token) return;
    finalizeOrderReturn({ data: { token, environment: getPaymentsEnvironment() } })
      .then((result) => {
        if ("error" in result) throw new Error(result.error);
        toast.success("Campaign paid — our team will reach out about your artwork.");
        window.history.replaceState({}, "", "/my-vibe");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not confirm payment"))
      .finally(() => {
        queryClient.invalidateQueries({ queryKey: ["ad-orders"] });
        queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] });
      });
  }, [queryClient]);

  const startCheckout = async () => {
    setBuying(true);
    try {
      const result = await createAdCheckout({
        data: {
          units: safeUnits,
          placement,
          notes,
          environment: getPaymentsEnvironment(),
          returnUrl: `${window.location.origin}/my-vibe?pp_return=1`,
        },
      });
      if ("error" in result) throw new Error(result.error);
      window.location.assign(result.approveUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start PayPal checkout");
      setBuying(false);
    }
  };

  const removePendingOrder = async (orderId: string) => {
    setDeletingId(orderId);
    try {
      const result = await deletePendingOrder({ data: { orderId } });
      if ("error" in result) throw new Error(result.error);
      toast.success("Pending campaign deleted.");
      await queryClient.invalidateQueries({ queryKey: ["ad-orders"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete campaign");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl">My Vibe</h1>
          <p className="mt-2 text-muted-foreground">{user?.email}</p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await supabase.auth.signOut();
            toast.success("Signed out. Walk good.");
          }}
        >
          <LogOut /> Sign out
        </Button>
      </div>

      <section className="mt-8" aria-labelledby="member-tools-title">
        <div className="mb-4">
          <h2 id="member-tools-title" className="font-display text-3xl uppercase tracking-wide">Your tools</h2>
          <p className="text-sm text-muted-foreground">Manage your music and send events to the station.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-gold/40 bg-surface">
            <CardContent className="flex h-full items-center gap-4 p-5">
              <div className="grid size-11 shrink-0 place-items-center rounded-md bg-gold/10 text-gold">
                <Disc3 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl uppercase tracking-wide">Artist Dashboard</h3>
                <p className="mt-1 text-sm text-muted-foreground">Manage releases, sales, earnings and your artist profile.</p>
              </div>
              <Button asChild size="icon" variant="ghost">
                <Link to="/artist-dashboard" aria-label="Open Artist Dashboard"><ChevronRight /></Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-rasta-green/40 bg-surface">
            <CardContent className="flex h-full items-center gap-4 p-5">
              <div className="grid size-11 shrink-0 place-items-center rounded-md bg-rasta-green/10 text-rasta-green">
                <CalendarPlus className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl uppercase tracking-wide">Add An Event</h3>
                <p className="mt-1 text-sm text-muted-foreground">Upload a flyer or submit full event details for review.</p>
              </div>
              <Button asChild size="icon" variant="ghost">
                <Link to="/add-event" aria-label="Add an event"><ChevronRight /></Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="advertiser-dashboard-title">
        <div className="mb-5 flex items-center gap-3">
          <BarChart3 className="text-gold" />
          <div>
            <h2 id="advertiser-dashboard-title" className="font-display text-3xl uppercase tracking-wide">
              Advertiser Dashboard
            </h2>
            <p className="text-sm text-muted-foreground">Live performance for your banner impression campaigns.</p>
          </div>
        </div>

        <div className="space-y-6">
          {campaigns.isLoading && <p className="text-muted-foreground">Loading your campaign data…</p>}
          {!campaigns.isLoading && (campaigns.data?.length ?? 0) === 0 && (
            <Card className="bg-surface">
              <CardContent className="py-6 text-muted-foreground">No paid impression campaigns found yet.</CardContent>
            </Card>
          )}
          {campaigns.data?.map((campaign) => <CampaignCard key={campaign.order_id} campaign={campaign} />)}
        </div>

        <div className="mt-12">
          <h3 className="font-display text-3xl uppercase tracking-wide">Buy impressions à la carte</h3>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Flat <span className="font-semibold text-gold">$3 CPM</span> — $3 for every 1,000 impressions across the
            Live Stream, Magazine, Visuals and Events pages.
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Card className="bg-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide">
                  <Megaphone className="text-gold" /> Build your campaign
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-2">
                  <Label htmlFor="units">Impressions (in thousands)</Label>
                  <Input
                    id="units"
                    type="number"
                    min={1}
                    max={1000}
                    value={units}
                    onChange={(event) => setUnits(Number(event.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">{(safeUnits * 1000).toLocaleString()} impressions</p>
                </div>

                <div className="grid gap-2">
                  <Label>Placement</Label>
                  <Select value={placement} onValueChange={(value) => setPlacement(value as Placement)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLACEMENTS.map((option) => (
                        <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Campaign notes</Label>
                  <Textarea
                    id="notes"
                    rows={4}
                    placeholder="Brand, artwork link, dates, target area (Tristate, DMV, NY, FL, Jamaica)…"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                  <span className="font-display text-2xl uppercase tracking-wide">{money(total)}</span>
                  <Button disabled={buying} onClick={() => void startCheckout()}>
                    {buying ? "Redirecting…" : "Buy impressions"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-surface">
              <CardHeader>
                <CardTitle className="font-display text-xl uppercase tracking-wide">Your campaigns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {orders.isLoading && <p className="text-muted-foreground">Loading your campaigns…</p>}
                {!orders.isLoading && (orders.data?.length ?? 0) === 0 && (
                  <p className="text-muted-foreground">No campaigns yet.</p>
                )}
                {orders.data?.map((order) => {
                  const pkg = findAdPackage(order.placement);
                  return (
                    <div key={order.id} className="flex items-center gap-3 border-b border-border pb-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {pkg ? `${pkg.name} · 3-Month Cycle` : `${order.impressions.toLocaleString()} impressions`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pkg?.cadence ?? PLACEMENTS.find((option) => option.id === order.placement)?.label ?? order.placement}
                          {" · "}{new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p>{money(order.amount_cents)}</p>
                        <p className={order.status === "paid" ? "text-xs text-gold" : "text-xs text-muted-foreground"}>
                          {order.status}
                        </p>
                      </div>
                      {order.status === "pending" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label="Delete pending campaign"
                              title="Delete pending campaign"
                              disabled={deletingId === order.id}
                            >
                              <Trash2 />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete pending campaign?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This removes the unpaid campaign from your list. Paid campaigns cannot be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep campaign</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => void removePendingOrder(order.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
