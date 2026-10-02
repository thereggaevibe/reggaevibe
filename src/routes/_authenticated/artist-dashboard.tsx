import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { getMyStorePrivate } from "@/lib/stores.functions";
import {
  GENRES,
  RELEASE_TYPES,
  money,
  myStoreQuery,
  slugify,
  storeOrdersQuery,
  storeReleasesQuery,
  toCsv,
  uploadMusicFile,
  type ArtistStore,
  type Genre,
  type MusicOrder,
  type ReleaseType,
} from "@/lib/music-queries";

const storePrivateQuery = (enabled: boolean) => ({
  queryKey: ["artist-store", "private-fields"],
  queryFn: () => getMyStorePrivate(),
  enabled,
});

export const Route = createFileRoute("/_authenticated/artist-dashboard")({
  head: () => ({
    meta: [
      { title: "Artist Dashboard — Reggae Vibe Music" },
      { name: "description", content: "Manage your catalogue, uploads and sales reports." },
      { property: "og:title", content: "Artist Dashboard — Reggae Vibe Music" },
      { property: "og:description", content: "Manage your catalogue, uploads and sales reports." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ArtistDashboard,
});

function ArtistDashboard() {
  const { user } = useAuth();
  const { data: store, isLoading } = useQuery(myStoreQuery(user?.id));
  const { data: privateFields } = useQuery(storePrivateQuery(Boolean(store)));
  const commissionPct = privateFields?.commissionPct ?? null;

  if (isLoading) return <p className="p-12 text-center text-sm text-muted-foreground">Loading your store…</p>;
  if (!store) return <StoreRequestForm userId={user?.id ?? ""} email={user?.email ?? ""} />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-4xl md:text-5xl">{store.name}</h1>
        <Badge variant={store.status === "approved" ? "default" : "secondary"} className="uppercase">
          {store.status}
        </Badge>
      </div>
      <p className="mt-3 text-muted-foreground">
        {commissionPct === null
          ? "Loading your commission terms…"
          : `You keep ${100 - commissionPct}% of every sale — the station's commission is ${commissionPct}%.`}
      </p>
      {store.status !== "approved" && (
        <p className="mt-4 rounded-lg border border-gold/40 bg-gold/10 p-4 text-sm text-gold">
          Your store is awaiting approval from the station. You can already upload releases — they go live as soon as
          you're approved.
        </p>
      )}

      <Tabs defaultValue="catalogue" className="mt-8">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
          <TabsTrigger value="upload">Upload release</TabsTrigger>
          <TabsTrigger value="sales">Sales &amp; earnings</TabsTrigger>
          <TabsTrigger value="profile">Store profile</TabsTrigger>
        </TabsList>
        <TabsContent value="catalogue" className="pt-6">
          <CataloguePanel store={store} />
        </TabsContent>
        <TabsContent value="upload" className="pt-6">
          <UploadPanel store={store} />
        </TabsContent>
        <TabsContent value="sales" className="pt-6">
          <SalesPanel store={store} commissionPct={commissionPct} />
        </TabsContent>
        <TabsContent value="profile" className="pt-6">
          <ProfilePanel store={store} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StoreRequestForm({ userId, email }: { userId: string; email: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [payout, setPayout] = useState(email);

  const request = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("artist_stores").insert({
        user_id: userId,
        name: name.trim(),
        slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`,
        bio: bio.trim() || null,
        payout_email: payout.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Store request sent — the station will review it shortly.");
      void qc.invalidateQueries({ queryKey: ["artist-store"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-4xl">Open your artist store</h1>
      <p className="mt-3 text-muted-foreground">
        Sell your singles, EPs and albums through Reggae Vibe Radio. Tell us who you are and the station will approve
        your store.
      </p>
      <div className="mt-8 space-y-4">
        <div>
          <Label htmlFor="store-name">Artist or label name</Label>
          <Input id="store-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="store-bio">Short bio</Label>
          <Textarea id="store-bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="store-payout">Payout email</Label>
          <Input id="store-payout" type="email" value={payout} onChange={(e) => setPayout(e.target.value)} />
        </div>
        <Button disabled={!name.trim() || request.isPending} onClick={() => request.mutate()}>
          {request.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Request store
        </Button>
      </div>
    </div>
  );
}

function CataloguePanel({ store }: { store: ArtistStore }) {
  const qc = useQueryClient();
  const { data: releases = [] } = useQuery(storeReleasesQuery(store.id));

  const toggle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("releases").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["releases"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("releases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Release removed");
      void qc.invalidateQueries({ queryKey: ["releases"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!releases.length) return <p className="text-sm text-muted-foreground">No releases yet — use the upload tab.</p>;

  return (
    <div className="space-y-3">
      {releases.map((r) => (
        <div key={r.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-3">
          <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
            {r.coverUrl && <img src={r.coverUrl} alt={`${r.title} cover art`} className="size-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{r.title}</p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {r.release_type} · {r.genre} · {money(r.price_cents)}
            </p>
          </div>
          <Badge variant={r.status === "published" ? "default" : "secondary"}>{r.status}</Badge>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toggle.mutate({ id: r.id, status: r.status === "published" ? "draft" : "published" })}
          >
            {r.status === "published" ? "Unpublish" : "Publish"}
          </Button>
          <Button size="icon" variant="ghost" aria-label={`Delete ${r.title}`} onClick={() => remove.mutate(r.id)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function UploadPanel({ store }: { store: ArtistStore }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState(store.name);
  const [type, setType] = useState<ReleaseType>("single");
  const [genre, setGenre] = useState<Genre>("reggae");
  const [price, setPrice] = useState("1.99");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [preview, setPreview] = useState<File | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const cover_path = cover ? await uploadMusicFile("release-art", `${store.id}/covers`, cover) : null;
      const preview_path = preview ? await uploadMusicFile("release-art", `${store.id}/previews`, preview) : null;
      const audio_path = audio ? await uploadMusicFile("release-audio", `${store.id}/audio`, audio) : null;
      const { error } = await supabase.from("releases").insert({
        store_id: store.id,
        title: title.trim(),
        artist_name: artist.trim() || store.name,
        release_type: type,
        genre,
        description: description.trim() || null,
        price_cents: Math.max(50, Math.round(Number(price) * 100)),
        release_year: Number(year) || null,
        cover_path,
        audio_path,
        preview_path,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Release published");
      setTitle("");
      setDescription("");
      setCover(null);
      setAudio(null);
      setPreview(null);
      void qc.invalidateQueries({ queryKey: ["releases"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="grid max-w-3xl gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="rel-title">Title</Label>
          <Input id="rel-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="rel-artist">Artist name</Label>
          <Input id="rel-artist" value={artist} onChange={(e) => setArtist(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="rel-type">Release type</Label>
          <select
            id="rel-type"
            value={type}
            onChange={(e) => setType(e.target.value as ReleaseType)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm uppercase"
          >
            {RELEASE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="rel-genre">Genre</Label>
          <select
            id="rel-genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value as Genre)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm capitalize"
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="rel-price">Price (USD)</Label>
          <Input id="rel-price" type="number" step="0.01" min="0.5" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="rel-year">Release year</Label>
          <Input id="rel-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
      </div>

      <div>
        <Label htmlFor="rel-desc">Description</Label>
        <Textarea id="rel-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="rel-cover">Cover art (hi-res)</Label>
          <Input id="rel-cover" type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <Label htmlFor="rel-preview">Preview clip (MP3)</Label>
          <Input id="rel-preview" type="file" accept="audio/*" onChange={(e) => setPreview(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <Label htmlFor="rel-audio">Full audio (WAV/MP3)</Label>
          <Input id="rel-audio" type="file" accept="audio/*" onChange={(e) => setAudio(e.target.files?.[0] ?? null)} />
        </div>
      </div>

      <Button className="w-fit" disabled={!title.trim() || create.isPending} onClick={() => create.mutate()}>
        {create.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        Publish release
      </Button>
    </div>
  );
}

const RANGES = [
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
  { key: "365", label: "Last 12 months" },
  { key: "all", label: "All time" },
] as const;

function SalesPanel({ store, commissionPct }: { store: ArtistStore; commissionPct: number | null }) {
  const { data: orders = [] } = useQuery(storeOrdersQuery(store.id));
  const [range, setRange] = useState<string>("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    let start: number | null = null;
    let end: number | null = null;
    if (from) start = new Date(from).getTime();
    if (to) end = new Date(to).getTime() + 86_400_000;
    if (!from && !to && range !== "all") start = Date.now() - Number(range) * 86_400_000;
    return orders.filter((o) => {
      const t = new Date(o.created_at).getTime();
      if (start && t < start) return false;
      if (end && t > end) return false;
      return true;
    });
  }, [orders, range, from, to]);

  const totals = filtered.reduce(
    (acc, o) => ({
      gross: acc.gross + o.gross_cents,
      commission: acc.commission + o.commission_cents,
      net: acc.net + o.net_cents,
    }),
    { gross: 0, commission: 0, net: 0 },
  );

  const chart = useMemo(() => {
    const byDay = new Map<string, number>();
    filtered.forEach((o) => {
      const day = o.created_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + o.net_cents);
    });
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, cents]) => ({ day, earnings: Number((cents / 100).toFixed(2)) }));
  }, [filtered]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reggaevibe-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <select
          value={range}
          onChange={(e) => {
            setRange(e.target.value);
            setFrom("");
            setTo("");
          }}
          aria-label="Reporting period"
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          {RANGES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <div>
          <Label htmlFor="sales-from" className="text-xs">
            Custom from
          </Label>
          <Input id="sales-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label htmlFor="sales-to" className="text-xs">
            Custom to
          </Label>
          <Input id="sales-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <Button variant="secondary" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Sales" value={String(filtered.length)} />
        <Stat label="Gross" value={money(totals.gross)} />
        <Stat label={commissionPct === null ? "Station commission" : `Station (${commissionPct}%)`} value={money(totals.commission)} />
        <Stat label="Your earnings" value={money(totals.net)} />
      </div>

      <div className="h-64 rounded-xl border border-border bg-card p-4">
        {chart.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                formatter={(v) => [`$${v}`, "Net earnings"]}
              />
              <Area type="monotone" dataKey="earnings" stroke="hsl(var(--gold))" fill="hsl(var(--gold) / 0.25)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="grid h-full place-items-center text-sm text-muted-foreground">No sales in this period yet.</p>
        )}
      </div>

      <Ledger rows={filtered} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}

function Ledger({ rows }: { rows: MusicOrder[] }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="p-3">Order date</th>
            <th className="p-3">Release</th>
            <th className="p-3">Buyer</th>
            <th className="p-3 text-right">Gross</th>
            <th className="p-3 text-right">Commission</th>
            <th className="p-3 text-right">Net</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-t border-border">
              <td className="p-3">{new Date(o.created_at).toLocaleString()}</td>
              <td className="p-3">{o.title_snapshot}</td>
              <td className="p-3 text-muted-foreground">{o.buyer_email ?? "—"}</td>
              <td className="p-3 text-right">{money(o.gross_cents)}</td>
              <td className="p-3 text-right text-muted-foreground">-{money(o.commission_cents)}</td>
              <td className="p-3 text-right font-semibold text-gold">{money(o.net_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProfilePanel({ store }: { store: ArtistStore }) {
  const qc = useQueryClient();
  const [name, setName] = useState(store.name);
  const [bio, setBio] = useState(store.bio ?? "");
  const [payout, setPayout] = useState("");
  const { data: privateFields } = useQuery(storePrivateQuery(true));
  useEffect(() => {
    if (privateFields) setPayout(privateFields.payoutEmail ?? "");
  }, [privateFields]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("artist_stores")
        .update({ name: name.trim(), bio: bio.trim() || null, payout_email: payout.trim() || null })
        .eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Store profile saved");
      void qc.invalidateQueries({ queryKey: ["artist-store"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="grid max-w-xl gap-4">
      <div>
        <Label htmlFor="prof-name">Artist or label name</Label>
        <Input id="prof-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="prof-bio">Bio</Label>
        <Textarea id="prof-bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="prof-payout">Payout email</Label>
        <Input id="prof-payout" type="email" value={payout} onChange={(e) => setPayout(e.target.value)} />
      </div>
      <Button className="w-fit" disabled={save.isPending} onClick={() => save.mutate()}>
        Save profile
      </Button>
    </div>
  );
}
