import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentTestModeBanner } from "@/components/music/PaymentTestModeBanner";
import { money } from "@/lib/music-queries";
import { getPaymentsEnvironment } from "@/lib/payments-client";
import { createAdPackageCheckout, finalizeOrderReturn } from "@/lib/billing.functions";
import { AD_PACKAGES } from "@/lib/ad-packages";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/advertise")({
  head: () => ({
    meta: [
      { title: "Advertise on Reggae Vibe Radio — $3 CPM" },
      {
        name: "description",
        content:
          "Reach reggae, dancehall and soca listeners across the Tristate, DMV, New York, Florida and Jamaica. Buy impressions at a flat $3 CPM.",
      },
      { property: "og:title", content: "Advertise on Reggae Vibe Radio" },
      { property: "og:description", content: "Flat $3 CPM across the stream, magazine, visuals and events pages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdvertisePage,
});

function AdvertisePage() {
  const { user } = useAuth();
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!params.get("pp_return") || !token) return;
    finalizeOrderReturn({ data: { token, environment: getPaymentsEnvironment() } })
      .then((result) => {
        if ("error" in result) throw new Error(result.error);
        toast.success("Campaign paid — our team will reach out about your artwork.");
        window.history.replaceState({}, "", "/advertise");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not confirm payment"));
  }, []);

  const buyPackage = async (packageId: string) => {
    setBuying(packageId);
    try {
      const result = await createAdPackageCheckout({
        data: {
          packageId,
          environment: getPaymentsEnvironment(),
          returnUrl: `${window.location.origin}/advertise?pp_return=1`,
        },
      });
      if ("error" in result) throw new Error(result.error);
      window.location.assign(result.approveUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start PayPal checkout");
      setBuying(null);
    }
  };

  const accentClass: Record<string, string> = {
    green: "border-rasta-green/60 from-rasta-green/20",
    gold: "border-gold/60 from-gold/20",
    red: "border-rasta-red/60 from-rasta-red/20",
  };

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rasta-stripe mb-6 h-1 w-24" />
        <h1 className="font-display text-4xl uppercase tracking-wide sm:text-5xl">Advertise With Us</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Pick a three-month campaign across radio, website and TV — or buy impressions à la carte at a flat{" "}
          <span className="text-gold font-semibold">$3 CPM</span>.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {AD_PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={`bg-gradient-to-b to-surface ${accentClass[pkg.accent] ?? "border-border"} border-2`}
            >
              <CardHeader>
                <CardTitle className="font-display text-2xl uppercase tracking-wide">{pkg.name}</CardTitle>
                <p className="font-display text-3xl text-gold">{money(pkg.priceCents)}</p>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{pkg.cadence}</p>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold">Radio</p>
                  <dl className="mt-2 space-y-2 text-muted-foreground">
                    {pkg.radioDetails.map((detail) => (
                      <div key={detail.label}>
                        <dt className="font-semibold text-foreground">{detail.label}:</dt>
                        <dd>{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold">Website</p>
                  <p className="text-muted-foreground">{pkg.website}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold">TV</p>
                  <p className="text-muted-foreground">{pkg.tv}</p>
                </div>
                {user ? (
                  <Button className="w-full" disabled={buying !== null} onClick={() => void buyPackage(pkg.id)}>
                    {buying === pkg.id ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" /> Redirecting…
                      </>
                    ) : (
                      `Subscribe via PayPal — ${money(pkg.priceCents)}`
                    )}
                  </Button>
                ) : (
                  <Button asChild className="w-full">
                    <Link to="/auth">Sign in to buy</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border-2 border-dashed border-gold/60 bg-gradient-to-br from-rasta-green/15 via-background to-rasta-red/15 p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-gold">Complimentary value-add</p>
          <p className="mt-2 text-sm text-muted-foreground">
            All paid packages include 12 complimentary social media ad posts (4 per month) and featured newsletter
            placements throughout the duration of your three-month campaign (valid through December 31, 2026).
          </p>
        </div>
      </div>

    </div>
  );
}
