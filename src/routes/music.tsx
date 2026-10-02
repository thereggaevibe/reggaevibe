import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReleaseCard } from "@/components/music/ReleaseCard";
import { ReleaseCheckoutDialog } from "@/components/music/ReleaseCheckoutDialog";
import { PaymentTestModeBanner } from "@/components/music/PaymentTestModeBanner";
import { GENRES, RELEASE_TYPES, marketplaceQuery, type ReleaseWithUrls } from "@/lib/music-queries";
import { getPaymentsEnvironment } from "@/lib/payments-client";
import { finalizeOrderReturn } from "@/lib/billing.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/music")({
  loader: ({ context }) => context.queryClient.ensureQueryData(marketplaceQuery()),
  head: () => ({
    meta: [
      { title: "Music Store — Buy Reggae, Dancehall & Soca Releases" },
      {
        name: "description",
        content:
          "Buy singles, EPs and albums direct from independent reggae, dancehall, soca and afrobeats artists on the Reggae Vibe Radio music store.",
      },
      { property: "og:title", content: "Reggae Vibe Music Store" },
      {
        property: "og:description",
        content: "Preview and buy releases direct from independent reggae, dancehall, soca and afrobeats artists.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MusicPage,
  errorComponent: ({ error }: { error: unknown }) => (
    <div role="alert" className="mx-auto max-w-2xl p-10 text-center text-muted-foreground">
      {error instanceof Error ? error.message : "Something went wrong"}
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">No releases found.</div>,
});

function MusicPage() {
  const { data: releases } = useSuspenseQuery(marketplaceQuery());
  const { user } = useAuth();
  const [term, setTerm] = useState("");
  const [genre, setGenre] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [checkout, setCheckout] = useState<ReleaseWithUrls | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!params.get("pp_return") || !token) return;
    finalizeOrderReturn({ data: { token, environment: getPaymentsEnvironment() } })
      .then((result) => {
        if ("error" in result) throw new Error(result.error);
        toast.success("Purchase complete — check the Downloads section on your artist dashboard.");
        window.history.replaceState({}, "", "/music");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not confirm your purchase"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return releases.filter((r) => {
      if (genre !== "all" && r.genre !== genre) return false;
      if (type !== "all" && r.release_type !== type) return false;
      if (!needle) return true;
      return `${r.title} ${r.artist_name}`.toLowerCase().includes(needle);
    });
  }, [releases, term, genre, type]);

  return (
    <div className="min-h-screen">
      <PaymentTestModeBanner />

      <header className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">The Unification Station</p>
          <h1 className="mt-2 font-display text-4xl uppercase sm:text-5xl">Music Store</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Independent releases straight from the artists. Preview any tune, then buy the download — artists keep the
            majority of every sale.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link to="/my-vibe">Artist tools in My Vibe</Link>
            </Button>
            {!user && (
              <span className="text-sm text-muted-foreground">
                <Link to="/auth" className="underline">
                  Sign in
                </Link>{" "}
                to buy or to open your own store.
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search artists or titles…"
              aria-label="Search releases"
              className="pl-9"
            />
          </div>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            aria-label="Filter by genre"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm capitalize"
          >
            <option value="all">All genres</option>
            {GENRES.map((g) => (
              <option key={g} value={g} className="capitalize">
                {g}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Filter by release type"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm uppercase"
          >
            <option value="all">All types</option>
            {RELEASE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">No releases match those filters yet.</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((release) => (
              <ReleaseCard
                key={release.id}
                release={release}
                onBuy={(r) => {
                  if (!user) {
                    window.location.href = "/auth";
                    return;
                  }
                  setCheckout(r);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {checkout && (
        <ReleaseCheckoutDialog
          releaseId={checkout.id}
          title={checkout.title}
          priceCents={checkout.price_cents}
          open={Boolean(checkout)}
          onOpenChange={(open) => !open && setCheckout(null)}
        />
      )}
    </div>
  );
}
