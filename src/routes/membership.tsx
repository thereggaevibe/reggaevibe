import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, Crown, Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaymentTestModeBanner } from "@/components/music/PaymentTestModeBanner";
import { PLANS, type PlanId } from "@/lib/billing-queries";
import { getPaymentsEnvironment } from "@/lib/payments-client";
import {
  cancelMySubscription,
  changeSubscriptionPlan,
  createSubscriptionCheckout,
  finalizeSubscriptionReturn,
} from "@/lib/billing.functions";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title: "VIP Membership & Artist Store Pro — Reggae Vibe Radio" },
      {
        name: "description",
        content:
          "Go VIP for an ad-free reggae stream, early visuals and double chart votes, or upgrade your artist storefront to Pro for a 10% station commission.",
      },
      { property: "og:title", content: "Reggae Vibe VIP Membership" },
      {
        property: "og:description",
        content: "Ad-free streaming, early visuals and a lower store commission for artists on Reggae Vibe Radio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MembershipPage,
});

function MembershipPage() {
  const { user } = useAuth();
  const { subscription, plan, isActive, loading } = useSubscription();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<PlanId | "cancel" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!params.get("pp_return") || !token) return;
    setBusy("cancel");
    finalizeSubscriptionReturn({ data: { token, environment: getPaymentsEnvironment() } })
      .then((result) => {
        if ("error" in result) throw new Error(result.error);
        toast.success("Welcome to the Vibe — your membership is active!");
        window.history.replaceState({}, "", "/membership");
        queryClient.invalidateQueries();
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not activate membership"))
      .finally(() => setBusy(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCheckout = async (planId: PlanId) => {
    setBusy(planId);
    try {
      const result = await createSubscriptionCheckout({
        data: {
          priceId: planId,
          environment: getPaymentsEnvironment(),
          returnUrl: `${window.location.origin}/membership?pp_return=1`,
        },
      });
      if ("error" in result) throw new Error(result.error);
      window.location.assign(result.approveUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start PayPal checkout");
      setBusy(null);
    }
  };

  const cancelPlan = async () => {
    if (!window.confirm("Cancel your membership? You keep your perks until the end of the period you already paid for.")) return;
    setBusy("cancel");
    try {
      const result = await cancelMySubscription({ data: { environment: getPaymentsEnvironment() } });
      if ("error" in result) throw new Error(result.error);
      toast.success("Membership set to end at the close of this billing period.");
      queryClient.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel membership");
    } finally {
      setBusy(null);
    }
  };

  const switchPlan = async (priceId: PlanId) => {
    setBusy(priceId);
    try {
      const result = await changeSubscriptionPlan({ data: { priceId, environment: getPaymentsEnvironment() } });
      if ("error" in result) throw new Error(result.error);
      toast.success(
        result.effective === "immediate"
          ? "Plan upgraded — PayPal applies the change immediately."
          : "Downgrade scheduled. You keep your current plan until the end of this billing period.",
      );
      queryClient.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change plan");
    } finally {
      setBusy(null);
    }
  };

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null;

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rasta-stripe mb-6 h-1 w-24" />
        <h1 className="font-display text-4xl uppercase tracking-wide text-foreground sm:text-5xl">
          Join the Vibe
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Support the Unification Station. VIP members stream ad-free and get first look at new visuals. Artists can go
          Pro and keep more of every sale.
        </p>

        {isActive && (
          <Card className="mt-8 border-gold/40 bg-surface">
            <CardContent className="flex flex-wrap items-center gap-4 py-5">
              <Badge className="bg-gold text-background">
                {PLANS.find((p) => p.id === plan)?.name ?? "Active plan"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Status: {subscription?.status}
                {subscription?.cancel_at_period_end && periodEnd
                  ? ` · access until ${periodEnd}`
                  : periodEnd
                    ? ` · renews ${periodEnd}`
                    : ""}
              </span>
              <Button className="ml-auto" variant="secondary" onClick={cancelPlan} disabled={busy === "cancel"}>
                {busy === "cancel" ? <Loader2 className="animate-spin" /> : <CreditCard />} Cancel plan
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => {
            const current = isActive && plan === p.id;
            return (
              <Card key={p.id} className={current ? "border-gold bg-surface" : "bg-surface"}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide">
                    {p.audience === "artist" ? <Store className="text-gold" /> : <Crown className="text-gold" />}
                    {p.name}
                  </CardTitle>
                  <p className="text-3xl font-bold text-foreground">
                    {p.priceLabel} <span className="text-sm font-normal text-muted-foreground">{p.cadence}</span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-gold" /> {perk}
                      </li>
                    ))}
                  </ul>
                  {!user ? (
                    <Button asChild className="w-full">
                      <Link to="/auth">Sign in to join</Link>
                    </Button>
                  ) : current ? (
                    <Button className="w-full" variant="secondary" disabled>
                      Your current plan
                    </Button>
                  ) : isActive ? (
                    <Button className="w-full" onClick={() => switchPlan(p.id)} disabled={busy === p.id || loading}>
                      {busy === p.id ? <Loader2 className="animate-spin" /> : null} Switch to {p.name}
                    </Button>
                  ) : (
                    <Button className="w-full" onClick={() => startCheckout(p.id)} disabled={busy === p.id}>
                      {busy === p.id ? <Loader2 className="animate-spin" /> : null} Get {p.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Upgrades start right away and are prorated. Downgrades and cancellations keep your benefits until the end of
          the period you already paid for. Promoting an event or brand instead?{" "}
          <Link to="/advertise" className="text-gold underline">
            Buy ad impressions
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
