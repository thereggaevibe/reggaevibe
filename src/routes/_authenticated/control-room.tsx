import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { DAY_NAMES, FLYER_AREAS, djsQuery, eventsQuery, flyersQuery, formatTime, isFlyerExpired, pendingSubmissionsQuery, showsQuery, type FlyerArea } from "@/lib/station-queries";
import { AnalyticsPanel } from "@/components/admin/AnalyticsPanel";
import { ArticlesPanel } from "@/components/admin/ArticlesPanel";
import { VideoCategoriesPanel } from "@/components/admin/VideoCategoriesPanel";
import { ArtistStoresPanel } from "@/components/admin/ArtistStoresPanel";
import { ShopCategoriesPanel } from "@/components/admin/ShopCategoriesPanel";
import { AdManagerAdminPanel } from "@/components/admin/AdManagerAdminPanel";
import { uploadImage } from "@/lib/articles-queries";
import { useServerFn } from "@tanstack/react-start";
import { backfillTrackArtwork } from "@/lib/itunes.functions";

export const Route = createFileRoute("/_authenticated/control-room")({
  head: () => ({
    meta: [
      { title: "Control Room — Reggae Vibe Radio" },
      { name: "description", content: "Station management: charts, schedule, DJs, events and shoutouts." },
      { property: "og:title", content: "Control Room — Reggae Vibe Radio" },
      { property: "og:description", content: "Station management for Reggae Vibe Radio." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ControlRoom,
});

function ControlRoom() {
  const { user } = useAuth();
  const { isAdmin, checked } = useIsAdmin(user);

  if (!checked) return <p className="p-12 text-center text-sm text-muted-foreground">Checking your access…</p>;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-3xl">Control Room</h1>
        <p className="mt-3 text-muted-foreground">
          This area is for station staff. Ask an existing admin to grant your account the admin role.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Signed in as {user?.email}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl md:text-5xl">Control Room</h1>
      <p className="mt-3 text-muted-foreground">Manage charts, schedule, team, events and listener shoutouts.</p>

      <Tabs defaultValue="tracks" className="mt-8">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="tracks">Tracks &amp; charts</TabsTrigger>
          <TabsTrigger value="shows">Schedule</TabsTrigger>
          <TabsTrigger value="djs">Team</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="shop">Shop</TabsTrigger>
          <TabsTrigger value="stores">Artist stores</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="ads">Ads</TabsTrigger>
          <TabsTrigger value="shoutouts">Shoutouts</TabsTrigger>
        </TabsList>
        <TabsContent value="tracks" className="pt-6"><TracksPanel /></TabsContent>
        <TabsContent value="shows" className="pt-6"><ShowsPanel /></TabsContent>
        <TabsContent value="djs" className="pt-6"><DjsPanel /></TabsContent>
        <TabsContent value="events" className="pt-6"><EventsHub /></TabsContent>
        <TabsContent value="articles" className="pt-6"><ArticlesPanel /></TabsContent>
        <TabsContent value="videos" className="pt-6"><VideoCategoriesPanel /></TabsContent>
        <TabsContent value="shop" className="pt-6"><ShopCategoriesPanel /></TabsContent>
        <TabsContent value="stores" className="pt-6"><ArtistStoresPanel /></TabsContent>
        <TabsContent value="analytics" className="pt-6"><AnalyticsPanel /></TabsContent>
        <TabsContent value="ads" className="pt-6"><AdManagerAdminPanel /></TabsContent>
        <TabsContent value="shoutouts" className="pt-6"><ShoutoutsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function useRefetch(keys: string[]) {
  const qc = useQueryClient();
  return () => keys.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
}

function TracksPanel() {
  const qc = useQueryClient();
  const runBackfill = useServerFn(backfillTrackArtwork);
  const [backfilling, setBackfilling] = useState(false);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<"all" | "visible" | "excluded" | "missing-artwork">("all");
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select("id, title, artist, artwork_url, category, category_locked, release_year, play_count, last_played_at, excluded")
        .order("last_played_at", { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const term = search.trim().toLowerCase();
  const tracks = (data ?? []).filter((track) => {
    if (visibility === "visible" && track.excluded) return false;
    if (visibility === "excluded" && !track.excluded) return false;
    if (visibility === "missing-artwork" && track.artwork_url) return false;
    if (!term) return true;
    return `${track.title} ${track.artist}`.toLowerCase().includes(term);
  });

  const update = useMutation({
    mutationFn: async (vars: { id: string; category?: "reggae" | "dancehall" | "other"; locked?: boolean; releaseYear?: number | null; excluded?: boolean; artworkUrl?: string | null }) => {
      const patch: { category?: "reggae" | "dancehall" | "other"; category_locked?: boolean; release_year?: number | null; excluded?: boolean; artwork_url?: string | null } = {};
      if (vars.artworkUrl !== undefined) patch.artwork_url = vars.artworkUrl;
      if (vars.category) patch.category = vars.category;
      if (vars.locked !== undefined) patch.category_locked = vars.locked;
      if (vars.releaseYear !== undefined) patch.release_year = vars.releaseYear;
      if (vars.excluded !== undefined) patch.excluded = vars.excluded;
      const { error } = await supabase.from("tracks").update(patch).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Track updated");
      qc.invalidateQueries({ queryKey: ["admin-tracks"] });
      qc.invalidateQueries({ queryKey: ["chart"] });
      qc.invalidateQueries({ queryKey: ["recently-played"] });
    },
    onError: () => toast.error("Could not update the track"),
  });


  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg">Chart categories</h2>
          <p className="text-xs text-muted-foreground">
            Tracks are auto-categorised from stream tags. Reassign a chart here, and lock it so auto-detection never
            overrides your choice.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={backfilling}
          onClick={async () => {
            setBackfilling(true);
            try {
              const result = await runBackfill({});
              toast.success(`Artwork lookup done — ${result.updated} of ${result.scanned} tracks updated`);
              qc.invalidateQueries({ queryKey: ["admin-tracks"] });
              qc.invalidateQueries({ queryKey: ["chart"] });
            } catch {
              toast.error("Artwork lookup failed");
            } finally {
              setBackfilling(false);
            }
          }}
        >
          {backfilling ? "Fetching artwork…" : "Fetch artwork & years"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tracks by title or artist…"
          aria-label="Search tracks"
          className="w-full sm:max-w-xs"
        />
        <div role="radiogroup" aria-label="Filter tracks by visibility" className="flex items-center gap-1 rounded-md border border-border p-1">
          {([
            { value: "all", label: "All" },
            { value: "visible", label: "Visible" },
            { value: "excluded", label: "Excluded" },
            { value: "missing-artwork", label: "No artwork" },
          ] as const).map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={visibility === option.value}
              onClick={() => setVisibility(option.value)}
              className={
                "rounded px-3 py-1 text-xs font-semibold " +
                (visibility === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
              }
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{tracks.length} track{tracks.length === 1 ? "" : "s"}</p>
      </div>

      {isLoading ? (
        <p className="p-5 text-sm text-muted-foreground">Loading tracks…</p>
      ) : tracks.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">No tracks match your search.</p>
      ) : (
        <ul className="divide-y divide-border">
          {tracks.map((track) => (
            <li key={track.id} className={"flex flex-wrap items-center gap-3 px-4 py-3 " + (track.excluded ? "opacity-60" : "")}>
              <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-secondary">
                {track.artwork_url ? (
                  <img src={track.artwork_url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="grid size-full place-items-center text-[9px] font-bold uppercase text-muted-foreground">No art</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{track.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {track.artist || "Unknown artist"} · {track.play_count} plays{track.excluded ? " · hidden" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  aria-label={`Upload artwork for ${track.title}`}
                  className="w-40 text-xs"
                  disabled={uploadingFor === track.id}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setUploadingFor(track.id);
                    try {
                      const url = await uploadImage("track-artwork", file, "tracks/");
                      await update.mutateAsync({ id: track.id, artworkUrl: url });
                    } catch {
                      toast.error("Could not upload the artwork");
                    } finally {
                      setUploadingFor(null);
                    }
                  }}
                />
              </div>
              <Select
                value={track.category}
                onValueChange={(value) =>
                  update.mutate({ id: track.id, category: value as "reggae" | "dancehall" | "other", locked: true })
                }
              >
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reggae">Reggae</SelectItem>
                  <SelectItem value="dancehall">Dancehall</SelectItem>
                  <SelectItem value="other">Unclassified</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1900}
                max={2100}
                defaultValue={track.release_year ?? ""}
                placeholder="Year"
                aria-label={`Release year for ${track.title}`}
                className="w-24"
                onBlur={(event) => update.mutate({ id: track.id, releaseYear: event.currentTarget.value ? Number(event.currentTarget.value) : null })}
              />

              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Exclude
                <Switch
                  checked={track.excluded}
                  aria-label={`Exclude ${track.title} from charts`}
                  onCheckedChange={(checked) => update.mutate({ id: track.id, excluded: checked })}
                />
              </label>
            </li>
          ))}
        </ul>
      )}

    </section>
  );
}

type Slot = { day_of_week: string; start_time: string; end_time: string };

function ShowsPanel() {
  const { data } = useQuery(showsQuery());
  const { data: djs } = useQuery(djsQuery());
  const refetch = useRefetch(["shows"]);
  const refetchDjs = useRefetch(["djs"]);
  const [form, setForm] = useState({ title: "", description: "", dj_id: "", new_host: "", image_url: "" });
  const [slots, setSlots] = useState<Slot[]>([{ day_of_week: "1", start_time: "18:00", end_time: "20:00" }]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  function updateSlot(index: number, patch: Partial<Slot>) {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  }

  async function createHost(name: string) {
    const { data: created, error } = await supabase
      .from("djs")
      .insert({ name, role: "Host" })
      .select("id")
      .single();
    if (error) throw error;
    refetchDjs();
    return created.id;
  }

  async function resolveHost() {
    if (form.new_host.trim()) return createHost(form.new_host.trim());
    return form.dj_id || null;
  }


  async function onImage(file: File | undefined, apply: (url: string) => void) {
    if (!file) return;
    setBusy(true);
    try {
      apply(await uploadImage("article-images", file, "shows/"));
      toast.success("Image uploaded");
    } catch {
      toast.error("Could not upload the image");
    } finally {
      setBusy(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const dj_id = await resolveHost();
      const rows = slots.map((slot) => ({
        title: form.title,
        description: form.description || null,
        dj_id,
        image_url: form.image_url || null,
        day_of_week: Number(slot.day_of_week),
        start_time: slot.start_time,
        end_time: slot.end_time,
      }));
      const { error } = await supabase.from("shows").insert(rows);
      if (error) throw error;
      toast.success(rows.length > 1 ? `${rows.length} airings added` : "Show added");
      setForm({ title: "", description: "", dj_id: "", new_host: "", image_url: "" });
      setSlots([{ day_of_week: "1", start_time: "18:00", end_time: "20:00" }]);
      refetch();
    } catch {
      toast.error("Could not save the show");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("shows").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete the show");
      return;
    }
    refetch();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={add} className="panel grid gap-4 p-5">
        <h2 className="text-lg">Add a programme</h2>
        <div className="grid gap-2">
          <Label htmlFor="s-title">Title</Label>
          <Input id="s-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="s-desc">Description</Label>
          <Textarea id="s-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="s-image">Show image</Label>
          <Input id="s-image" type="file" accept="image/*" onChange={(e) => void onImage(e.target.files?.[0], (url) => setForm((f) => ({ ...f, image_url: url })))} />
          {form.image_url && <img src={form.image_url} alt="Show artwork preview" className="h-24 w-40 rounded-md object-cover" />}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Host</Label>
            <Select value={form.dj_id} onValueChange={(v) => setForm({ ...form, dj_id: v })}>
              <SelectTrigger><SelectValue placeholder="No host" /></SelectTrigger>
              <SelectContent>
                {(djs ?? []).map((dj) => (
                  <SelectItem key={dj.id} value={dj.id}>{dj.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s-newhost">Or add a new host</Label>
            <Input id="s-newhost" placeholder="Host name" value={form.new_host} onChange={(e) => setForm({ ...form, new_host: e.target.value })} />
          </div>
        </div>

        <div className="grid gap-3">
          <Label>Airtimes</Label>
          {slots.map((slot, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
              <div className="grid gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Day</span>
                <Select value={slot.day_of_week} onValueChange={(v) => updateSlot(index, { day_of_week: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map((day, i) => (
                      <SelectItem key={day} value={String(i)}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Start</span>
                <Input type="time" required value={slot.start_time} onChange={(e) => updateSlot(index, { start_time: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">End</span>
                <Input type="time" required value={slot.end_time} onChange={(e) => updateSlot(index, { end_time: e.target.value })} />
              </div>
              {index === slots.length - 1 ? (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label="Add another day"
                  onClick={() => setSlots([...slots, { ...slot }])}
                >
                  <Plus />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remove this airing"
                  onClick={() => setSlots(slots.filter((_, i) => i !== index))}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Add programme"}</Button>
      </form>

      <section className="panel overflow-hidden">
        <div className="border-b border-border px-5 py-4"><h2 className="text-lg">Weekly grid</h2></div>
        <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto">
          {(data ?? []).map((show) => (
            <li key={show.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                {show.image_url && <img src={show.image_url} alt="" className="h-10 w-14 rounded object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{show.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {DAY_NAMES[show.day_of_week]} · {formatTime(show.start_time)}–{formatTime(show.end_time)}
                    {show.djs?.name ? ` · ${show.djs.name}` : ""}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Edit show"
                  onClick={() => setEditing(editing === show.id ? null : show.id)}
                >
                  <Pencil />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Delete show" onClick={() => remove(show.id)}>
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
              {editing === show.id && (
                <ShowEditor
                  show={show}
                  siblings={(data ?? []).filter(
                    (row) => row.title.trim().toLowerCase() === show.title.trim().toLowerCase() && (row.dj_id ?? "") === (show.dj_id ?? ""),
                  ) as EditableShow[]}
                  djs={djs ?? []}
                  onImage={onImage}
                  createHost={createHost}
                  onDone={() => {
                    setEditing(null);
                    refetch();
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

type EditableShow = {
  id: string;
  title: string;
  description: string | null;
  dj_id: string | null;
  image_url: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type EditSlot = { id: string | null; day_of_week: string; start_time: string; end_time: string };

function ShowEditor({
  show,
  siblings,
  djs,
  onImage,
  createHost,
  onDone,
}: {
  show: EditableShow;
  siblings: EditableShow[];
  djs: { id: string; name: string }[];
  onImage: (file: File | undefined, apply: (url: string) => void) => Promise<void>;
  createHost: (name: string) => Promise<string>;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState({
    title: show.title,
    description: show.description ?? "",
    dj_id: show.dj_id ?? "",
    new_host: "",
    image_url: show.image_url ?? "",
  });
  const [slots, setSlots] = useState<EditSlot[]>(
    (siblings.length ? siblings : [show]).map((row) => ({
      id: row.id,
      day_of_week: String(row.day_of_week),
      start_time: row.start_time.slice(0, 5),
      end_time: row.end_time.slice(0, 5),
    })),
  );
  const [removed, setRemoved] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function updateSlot(index: number, patch: Partial<EditSlot>) {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  }

  function dropSlot(index: number) {
    const slot = slots[index]!;
    if (slots.length === 1) {
      toast.error("A programme needs at least one airtime");
      return;
    }
    if (slot.id) setRemoved((prev) => [...prev, slot.id!]);
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setSaving(true);
    try {
      const dj_id = draft.new_host.trim() ? await createHost(draft.new_host.trim()) : draft.dj_id || null;
      const shared = {
        title: draft.title,
        description: draft.description || null,
        dj_id,
        image_url: draft.image_url || null,
      };
      for (const slot of slots) {
        const payload = {
          ...shared,
          day_of_week: Number(slot.day_of_week),
          start_time: slot.start_time,
          end_time: slot.end_time,
        };
        if (slot.id) {
          const { error } = await supabase.from("shows").update(payload).eq("id", slot.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("shows").insert(payload);
          if (error) throw error;
        }
      }
      if (removed.length) {
        const { error } = await supabase.from("shows").delete().in("id", removed);
        if (error) throw error;
      }
      toast.success("Programme updated");
      onDone();
    } catch {
      toast.error("Could not update the programme");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 grid gap-3 rounded-lg border border-border bg-background/40 p-3">
      <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
      <Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" />
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Host</span>
          <Select value={draft.dj_id} onValueChange={(v) => setDraft({ ...draft, dj_id: v, new_host: "" })}>
            <SelectTrigger><SelectValue placeholder="No host" /></SelectTrigger>
            <SelectContent>
              {djs.map((dj) => (
                <SelectItem key={dj.id} value={dj.id}>{dj.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Or add a new host</span>
          <Input placeholder="Host name" value={draft.new_host} onChange={(e) => setDraft({ ...draft, new_host: e.target.value })} />
        </div>
      </div>

      <div className="grid gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Airtimes</span>
        {slots.map((slot, index) => (
          <div key={slot.id ?? `new-${index}`} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
            <Select value={slot.day_of_week} onValueChange={(v) => updateSlot(index, { day_of_week: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAY_NAMES.map((day, i) => (
                  <SelectItem key={day} value={String(i)}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="time" value={slot.start_time} onChange={(e) => updateSlot(index, { start_time: e.target.value })} />
            <Input type="time" value={slot.end_time} onChange={(e) => updateSlot(index, { end_time: e.target.value })} />
            <Button type="button" size="icon" variant="ghost" aria-label="Remove this airtime" onClick={() => dropSlot(index)}>
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="justify-self-start"
          onClick={() => setSlots([...slots, { id: null, day_of_week: slots[slots.length - 1]?.day_of_week ?? "1", start_time: "18:00", end_time: "20:00" }])}
        >
          <Plus className="mr-1 size-4" /> Add airtime
        </Button>
      </div>

      <div className="grid gap-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Programme image</span>
        <Input type="file" accept="image/*" onChange={(e) => void onImage(e.target.files?.[0], (url) => setDraft((d) => ({ ...d, image_url: url })))} />
        {draft.image_url && <img src={draft.image_url} alt="Show artwork" className="mt-2 h-24 w-40 rounded-md object-cover" />}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}


function DjsPanel() {
  const { data } = useQuery(djsQuery());
  const refetch = useRefetch(["djs"]);
  const [form, setForm] = useState({ name: "", role: "DJ", bio: "", photo_url: "", instagram: "", x: "" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const socials: Record<string, string> = {};
    if (form.instagram) socials["instagram"] = form.instagram;
    if (form.x) socials["x"] = form.x;
    const { error } = await supabase.from("djs").insert({
      name: form.name,
      role: form.role,
      bio: form.bio || null,
      photo_url: form.photo_url || null,
      socials,
    });
    if (error) {
      toast.error("Could not save the profile");
      return;
    }
    toast.success("Profile added");
    setForm({ name: "", role: "DJ", bio: "", photo_url: "", instagram: "", x: "" });
    refetch();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("djs").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete the profile");
      return;
    }
    refetch();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={add} className="panel grid gap-4 p-5">
        <h2 className="text-lg">Add a DJ / host / speaker</h2>
        <div className="grid gap-2">
          <Label htmlFor="d-name">Name</Label>
          <Input id="d-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="d-role">Role</Label>
          <Input id="d-role" required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="d-photo">Photo URL</Label>
          <Input id="d-photo" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="d-bio">Bio</Label>
          <Textarea id="d-bio" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="d-ig">Instagram URL</Label>
            <Input id="d-ig" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="d-x">X / other URL</Label>
            <Input id="d-x" value={form.x} onChange={(e) => setForm({ ...form, x: e.target.value })} />
          </div>
        </div>
        <Button type="submit">Add profile</Button>
      </form>

      <section className="panel overflow-hidden">
        <div className="border-b border-border px-5 py-4"><h2 className="text-lg">Team</h2></div>
        <ul className="divide-y divide-border">
          {(data ?? []).map((dj) => (
            <li key={dj.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{dj.name}</p>
                <p className="text-xs text-muted-foreground">{dj.role}</p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Delete profile" onClick={() => remove(dj.id)}>
                <Trash2 className="text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const EMPTY_EVENT = {
  title: "",
  guest: "",
  venue: "",
  starts_at: "",
  description: "",
  image_url: "",
  city: "",
  state: "",
  country: "",
  mode: "specific" as "specific" | "recurring",
  frequency: "weekly" as "daily" | "weekly" | "monthly" | "custom",
  interval: "1",
  until: "",
};

/** ISO timestamp -> value for <input type="datetime-local"> in the browser's local zone. */
function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function EventsHub() {
  const [view, setView] = useState<"events" | "flyers">("events");
  const { data: submissions } = useQuery(pendingSubmissionsQuery());
  const pendingCount = (submissions ?? []).length;

  return (
    <div className="grid gap-6">
      <div role="tablist" aria-label="Events sections" className="flex flex-wrap gap-1 rounded-md border border-border p-1">
        {([
          { value: "events", label: "Events" },
          { value: "flyers", label: "Flyers" },
        ] as const).map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={view === option.value}
            onClick={() => setView(option.value)}
            className={
              "rounded px-4 py-2 text-sm font-semibold " +
              (view === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
            }
          >
            {option.label}
            {option.value === "events" && pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold text-background">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {view === "events" ? (
        <>
          <SubmissionsQueue />
          <EventsPanel />
        </>
      ) : (
        <FlyersPanel />
      )}
    </div>
  );
}

/** Front-end submissions awaiting moderation: post the event text, the flyer, or both. */
function SubmissionsQueue() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(pendingSubmissionsQuery());
  const [busyId, setBusyId] = useState<string | null>(null);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["event-submissions"] });
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["event-flyers"] });
  }

  async function approve(eventId: string | null, flyerId: string | null) {
    setBusyId(eventId ?? flyerId);
    if (eventId) {
      const { error } = await supabase.from("events").update({ is_approved: true }).eq("id", eventId);
      if (error) {
        setBusyId(null);
        toast.error("Could not post the event");
        return;
      }
    }
    if (flyerId) {
      const { error } = await supabase.from("event_flyers").update({ is_approved: true }).eq("id", flyerId);
      if (error) {
        setBusyId(null);
        toast.error("Could not post the flyer");
        return;
      }
    }
    setBusyId(null);
    toast.success("Published");
    refresh();
  }

  async function reject(eventId: string | null, flyer: { id: string; storage_path: string } | null) {
    setBusyId(eventId ?? flyer?.id ?? null);
    if (flyer) {
      await supabase.storage.from("event-flyers").remove([flyer.storage_path]);
      await supabase.from("event_flyers").delete().eq("id", flyer.id);
    }
    if (eventId) await supabase.from("events").delete().eq("id", eventId);
    setBusyId(null);
    toast.success("Submission removed");
    refresh();
  }

  const rows = data ?? [];

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-lg">Submissions awaiting review</h2>
        <span className="text-xs text-muted-foreground">{rows.length} pending</span>
      </div>
      {isLoading && <p className="px-5 py-4 text-sm text-muted-foreground">Loading submissions…</p>}
      {!isLoading && !rows.length && (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          Nothing to review. Member submissions from the Add An Event page land here.
        </p>
      )}
      <ul className="divide-y divide-border">
        {rows.map((row) => {
          const key = row.event?.id ?? row.flyer?.id ?? "";
          const place = [row.event?.city, row.event?.state, row.event?.country].filter(Boolean).join(", ");
          const busy = busyId === key;
          const eventPending = Boolean(row.event && !row.event.is_approved);
          const flyerPending = Boolean(row.flyer && !row.flyer.is_approved);
          return (
            <li key={key} className="flex flex-wrap items-start gap-4 px-5 py-4">
              {row.flyer?.url ? (
                <img
                  src={row.flyer.url}
                  alt={row.flyer.title || "Submitted flyer"}
                  className="size-20 rounded-md border border-border object-cover"
                />
              ) : (
                <div className="grid size-20 place-items-center rounded-md border border-border text-muted-foreground">
                  <ImageIcon className="size-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {row.event?.title || row.flyer?.title || "Untitled flyer"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.event
                    ? `${new Date(row.event.starts_at).toLocaleString()}${row.event.venue ? ` · ${row.event.venue}` : ""}${place ? ` · ${place}` : ""}`
                    : `Flyer only · ${FLYER_AREAS.find((a) => a.value === row.flyer?.area)?.label ?? row.flyer?.area}`}
                </p>
                {row.event?.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.event.description}</p>
                )}
                <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {eventPending ? "Event pending" : row.event ? "Event live" : ""}
                  {eventPending && flyerPending ? " · " : ""}
                  {flyerPending ? "Flyer pending" : row.flyer ? " · Flyer live" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {eventPending && (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => { void approve(row.event!.id, null); }}>
                    <Check className="size-4" /> Post Event
                  </Button>
                )}
                {flyerPending && (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => { void approve(null, row.flyer!.id); }}>
                    <Check className="size-4" /> Post Flyer
                  </Button>
                )}
                {eventPending && flyerPending && (
                  <Button size="sm" disabled={busy} onClick={() => { void approve(row.event!.id, row.flyer!.id); }}>
                    <Check className="size-4" /> Post both
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Reject submission"
                  disabled={busy}
                  onClick={() => {
                    void reject(
                      row.event?.id ?? null,
                      row.flyer ? { id: row.flyer.id, storage_path: row.flyer.storage_path } : null,
                    );
                  }}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EventsPanel() {
  const qc = useQueryClient();
  const { data } = useQuery(eventsQuery(false));
  const refetch = useRefetch(["events"]);

  const [form, setForm] = useState({ ...EMPTY_EVENT });
  const [editingId, setEditingId] = useState<string | null>(null);

  const recurring = form.mode === "recurring";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.starts_at) {
      toast.error(recurring ? "Pick the first date and time" : "Pick a date and time");
      return;
    }
    const payload = {
      title: form.title,
      guest: form.guest || null,
      venue: form.venue || null,
      description: form.description || null,
      image_url: form.image_url || null,
      starts_at: new Date(form.starts_at).toISOString(),
      city: form.city || null,
      state: form.state || null,
      country: form.country || null,
      is_recurring: recurring,
      recurrence_frequency: recurring ? form.frequency : null,
      recurrence_interval: recurring ? Math.max(1, Number(form.interval) || 1) : 1,
      recurrence_until: recurring && form.until ? new Date(form.until).toISOString() : null,
      is_approved: true,
    };
    const { error } = editingId
      ? await supabase.from("events").update(payload).eq("id", editingId)
      : await supabase.from("events").insert(payload);
    if (error) {
      toast.error("Could not save the event");
      return;
    }
    toast.success(editingId ? "Event updated" : "Event added");
    setForm({ ...EMPTY_EVENT });
    setEditingId(null);
    refetch();
  }

  function startEdit(event: Record<string, unknown>) {
    setEditingId(String(event["id"]));
    setForm({
      title: String(event["title"] ?? ""),
      guest: String(event["guest"] ?? ""),
      venue: String(event["venue"] ?? ""),
      starts_at: toLocalInput(event["starts_at"] ? String(event["starts_at"]) : null),
      description: String(event["description"] ?? ""),
      image_url: String(event["image_url"] ?? ""),
      city: String(event["city"] ?? ""),
      state: String(event["state"] ?? ""),
      country: String(event["country"] ?? ""),
      mode: event["is_recurring"] ? "recurring" : "specific",
      frequency: (String(event["recurrence_frequency"] ?? "weekly") as "daily" | "weekly" | "monthly" | "custom"),
      interval: String(event["recurrence_interval"] ?? 1),
      until: toLocalInput(event["recurrence_until"] ? String(event["recurrence_until"]) : null),
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function approveEvent(id: string) {
    const { error } = await supabase.from("events").update({ is_approved: true }).eq("id", id);
    if (error) {
      toast.error("Could not approve the event");
      return;
    }
    toast.success("Event posted");
    qc.invalidateQueries({ queryKey: ["event-submissions"] });
    refetch();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete the event");
      return;
    }
    if (editingId === id) {
      setEditingId(null);
      setForm({ ...EMPTY_EVENT });
    }
    qc.invalidateQueries({ queryKey: ["event-submissions"] });
    refetch();
  }


  const startDate = form.starts_at ? new Date(form.starts_at) : null;
  const validStart = startDate && !Number.isNaN(startDate.getTime()) ? startDate : null;
  const weekdayName = validStart ? validStart.toLocaleDateString(undefined, { weekday: "long" }) : "";
  const monthlyOrdinal = validStart
    ? ["first", "second", "third", "fourth", "fifth"][Math.floor((validStart.getDate() - 1) / 7)] ?? "last"
    : "";

  function recurrenceLabel(event: Record<string, unknown>) {
    if (!event["is_recurring"]) return "";
    const freq = String(event["recurrence_frequency"] ?? "");
    const every = Number(event["recurrence_interval"] ?? 1);
    const startsAt = event["starts_at"] ? new Date(String(event["starts_at"])) : null;
    const day =
      startsAt && !Number.isNaN(startsAt.getTime())
        ? startsAt.toLocaleDateString(undefined, { weekday: "long" })
        : "";
    const onDay = day && freq !== "daily" ? ` on ${day}s` : "";
    if (freq === "custom") return ` · repeats every ${every} day${every === 1 ? "" : "s"}${day ? ` from ${day}` : ""}`;
    if (every > 1) return ` · repeats every ${every} ${freq === "daily" ? "days" : freq === "weekly" ? "weeks" : "months"}${onDay}`;
    return ` · repeats ${freq}${onDay}`;
  }


  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={submit} className="panel grid gap-4 p-5">
        <h2 className="text-lg">{editingId ? "Edit event" : "Add an event"}</h2>
        <div className="grid gap-2">
          <Label htmlFor="e-title">Title</Label>
          <Input id="e-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="e-guest">Special guest</Label>
            <Input id="e-guest" value={form.guest} onChange={(e) => setForm({ ...form, guest: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="e-venue">Venue</Label>
            <Input id="e-venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="e-city">City</Label>
            <Input id="e-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="e-state">State</Label>
            <Input id="e-state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="e-country">Country <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="e-country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
        </div>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold">Event type</legend>
          <div role="radiogroup" className="flex flex-wrap gap-1 rounded-md border border-border p-1">
            {([
              { value: "specific", label: "Specific date" },
              { value: "recurring", label: "Recurring event" },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={form.mode === option.value}
                onClick={() => setForm({ ...form, mode: option.value })}
                className={
                  "rounded px-3 py-1 text-xs font-semibold " +
                  (form.mode === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
                }
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="e-date">{recurring ? "First occurrence (date & time)" : "Date & time"}</Label>
            <Input id="e-date" type="datetime-local" required value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
          </div>

          {recurring && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="e-freq">Repeats</Label>
                <select
                  id="e-freq"
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value as typeof form.frequency })}
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly{weekdayName ? ` (every ${weekdayName})` : ""}</option>
                  <option value="monthly">Monthly{weekdayName ? ` (on the ${monthlyOrdinal} ${weekdayName})` : ""}</option>
                  <option value="custom">Custom (every N days){weekdayName ? ` — starts ${weekdayName}` : ""}</option>
                </select>
                {weekdayName && (
                  <p className="text-xs text-muted-foreground">First occurrence falls on a {weekdayName}.</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="e-interval">
                  {form.frequency === "custom" ? "Every N days" : `Every N ${form.frequency === "daily" ? "days" : form.frequency === "weekly" ? "weeks" : "months"}`}
                </Label>
                <Input
                  id="e-interval"
                  type="number"
                  min={1}
                  value={form.interval}
                  onChange={(e) => setForm({ ...form, interval: e.target.value })}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="e-until">Ends on <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="e-until" type="datetime-local" value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value })} />
              </div>
            </div>
          )}
        </fieldset>

        <div className="grid gap-2">
          <Label htmlFor="e-desc">Description</Label>
          <Textarea id="e-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <Button type="submit">{editingId ? "Save changes" : "Add event"}</Button>
          {editingId && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingId(null);
                setForm({ ...EMPTY_EVENT });
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      <section className="panel overflow-hidden">
        <div className="border-b border-border px-5 py-4"><h2 className="text-lg">Calendar</h2></div>
        <ul className="divide-y divide-border">
          {(data ?? []).map((event) => {
            const place = [event.city, event.state].filter(Boolean).join(", ");
            return (
              <li
                key={event.id}
                className={"flex items-center gap-3 px-4 py-3 " + (editingId === event.id ? "bg-secondary/50" : "")}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{event.title}</p>
                  {!event.is_approved && (
                    <p className="text-xs font-bold uppercase tracking-wider text-gold">Needs approval</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.starts_at).toLocaleString()} {event.venue ? `· ${event.venue}` : ""} {place ? `· ${place}` : ""}
                    {recurrenceLabel(event as unknown as Record<string, unknown>)}
                  </p>
                </div>
                {!event.is_approved && (
                  <Button size="sm" onClick={() => { void approveEvent(event.id); }}>Approve</Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Edit ${event.title}`}
                  onClick={() => startEdit(event as unknown as Record<string, unknown>)}
                >
                  <Pencil />
                </Button>

                <Button size="icon" variant="ghost" aria-label="Delete event" onClick={() => remove(event.id)}>
                  <Trash2 className="text-destructive" />
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}


function FlyersPanel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [area, setArea] = useState<FlyerArea>("tristate");
  const [title, setTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [listArea, setListArea] = useState<FlyerArea>("tristate");
  const { data } = useQuery(flyersQuery(listArea, 30, true, true));

  function refresh() {
    qc.invalidateQueries({ queryKey: ["event-flyers"] });
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Choose a flyer image first");
      return;
    }
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${area}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("event-flyers").upload(path, file, { contentType: file.type });
    if (up.error) {
      setBusy(false);
      toast.error(up.error.message || "Could not upload the flyer image");
      return;
    }
    const { error } = await supabase.from("event_flyers").insert({
      area,
      title: title || null,
      storage_path: path,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      created_by: user?.id ?? null,
      is_approved: true,
    });
    setBusy(false);
    if (error) {
      await supabase.storage.from("event-flyers").remove([path]);
      toast.error(error.message || "Could not save the flyer");
      return;
    }
    toast.success("Flyer uploaded");
    setTitle("");
    setExpiresAt("");
    setFile(null);
    setListArea(area);
    refresh();
  }

  async function approveFlyer(id: string) {
    const { error } = await supabase.from("event_flyers").update({ is_approved: true }).eq("id", id);
    if (error) {
      toast.error("Could not approve the flyer");
      return;
    }
    toast.success("Flyer posted");
    qc.invalidateQueries({ queryKey: ["event-submissions"] });
    refresh();
  }

  async function remove(id: string, path: string) {
    await supabase.storage.from("event-flyers").remove([path]);
    const { error } = await supabase.from("event_flyers").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete the flyer");
      return;
    }
    qc.invalidateQueries({ queryKey: ["event-submissions"] });
    refresh();
  }


  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={upload} className="panel grid gap-4 p-5">
        <h2 className="text-lg">Upload an event flyer</h2>
        <div className="grid gap-2">
          <Label htmlFor="f-area">Area</Label>
          <Select value={area} onValueChange={(value) => setArea(value as FlyerArea)}>
            <SelectTrigger id="f-area"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FLYER_AREAS.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="f-title">Flyer title (optional)</Label>
          <Input id="f-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="f-expires">Expiration date &amp; time (optional)</Label>
          <Input
            id="f-expires"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Once this date and time pass, the flyer disables itself everywhere on the site.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="f-file">Flyer image</Label>
          <Input
            id="f-file"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload flyer"}</Button>
      </form>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-lg">Flyers by area</h2>
          <Select value={listArea} onValueChange={(value) => setListArea(value as FlyerArea)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FLYER_AREAS.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ul className="divide-y divide-border">
          {(data?.flyers ?? []).map((flyer) => (
            <li key={flyer.id} className="flex items-center gap-3 px-4 py-3">
              <img
                src={flyer.url}
                alt=""
                className={`size-12 rounded-md border border-border object-cover ${isFlyerExpired(flyer) ? "opacity-40 grayscale" : ""}`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {flyer.title || "Untitled flyer"}
                  {isFlyerExpired(flyer) && (
                    <span className="ml-2 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                      Expired
                    </span>
                  )}
                </p>
                {flyer.is_approved === false && (
                  <p className="text-xs font-bold uppercase tracking-wider text-gold">Needs approval</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {flyer.expires_at
                    ? `${isFlyerExpired(flyer) ? "Expired" : "Expires"} ${new Date(flyer.expires_at).toLocaleString()}`
                    : `Uploaded ${new Date(flyer.created_at).toLocaleDateString()} · no expiration`}
                </p>
              </div>
              {flyer.is_approved === false && (
                <Button size="sm" onClick={() => { void approveFlyer(flyer.id); }}>Approve</Button>
              )}
              <Button size="icon" variant="ghost" aria-label="Delete flyer" onClick={() => { void remove(flyer.id, flyer.storage_path); }}>
                <Trash2 className="text-destructive" />
              </Button>

            </li>
          ))}
          {!(data?.flyers ?? []).length && <li className="px-5 py-4 text-sm text-muted-foreground">No flyers here yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function ShoutoutsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["shoutouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shoutouts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function markRead(id: string) {
    const { error } = await supabase.from("shoutouts").update({ status: "read" }).eq("id", id);
    if (error) {
      toast.error("Could not update the shoutout");
      return;
    }
    qc.invalidateQueries({ queryKey: ["shoutouts"] });
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-lg">Listener shoutouts</h2>
        <p className="text-xs text-muted-foreground">Messages sent from the site. Reply from thereggaevibe@gmail.com.</p>
      </div>
      {isLoading ? (
        <p className="p-5 text-sm text-muted-foreground">Loading inbox…</p>
      ) : !data?.length ? (
        <p className="p-5 text-sm text-muted-foreground">No shoutouts yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((item) => (
            <li key={item.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{item.sender_name}</p>
                {item.sender_email && (
                  <a href={`mailto:${item.sender_email}`} className="text-xs text-gold hover:underline">
                    {item.sender_email}
                  </a>
                )}
                <time className="ml-auto text-xs text-muted-foreground" dateTime={item.created_at}>
                  {new Date(item.created_at).toLocaleString()}
                </time>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.message}</p>
              <div className="mt-3 flex items-center gap-3">
                {item.status === "new" ? (
                  <Button size="sm" variant="secondary" onClick={() => markRead(item.id)}>Mark as read</Button>
                ) : (
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Read</span>
                )}
                <a
                  className="text-xs text-gold hover:underline"
                  href={`mailto:thereggaevibe@gmail.com?subject=${encodeURIComponent(`Shoutout from ${item.sender_name}`)}&body=${encodeURIComponent(item.message)}`}
                >
                  Forward to station inbox
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
