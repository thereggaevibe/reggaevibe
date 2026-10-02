import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, ImagePlus, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FLYER_AREAS } from "@/lib/station-queries";

type FlyerArea = (typeof FLYER_AREAS)[number]["value"];

const title = "Add An Event — Reggae Vibe Radio";
const description =
  "Logged-in members can upload an event flyer in seconds or submit full event details to the Reggae Vibe Radio calendar.";

export const Route = createFileRoute("/add-event")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AddEventPage,
});

const EMPTY_EVENT = {
  title: "",
  guest: "",
  venue: "",
  starts_at: "",
  description: "",
  city: "",
  state: "",
  country: "",
  mode: "specific" as "specific" | "recurring",
  frequency: "weekly" as "daily" | "weekly" | "monthly" | "custom",
  interval: "1",
  until: "",
};

/** Uploads a flyer image to the member's own folder and returns its storage path. */
async function uploadFlyerImage(userId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("event-flyers")
    .upload(path, file, { contentType: file.type || "image/jpeg" });
  if (error) throw new Error(error.message || "Could not upload the flyer image");
  return path;
}

const PENDING_NOTE =
  "Submissions go to the Reggae Vibe Radio control room for review. Once a moderator approves it, your event and flyer go live on the events page.";

function AddEventPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"flyer" | "full">("flyer");

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center text-sm text-muted-foreground">
        Checking your session…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-4xl">Add An Event</h1>
        <p className="mt-4 text-muted-foreground">
          You need to be signed in to add an event and upload a flyer.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/auth">Sign in to continue</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl md:text-5xl">Add An Event</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Two ways to get on the Reggae Vibe Radio calendar: drop your flyer for a quick post, or fill out the
        full event details with your flyer image.
      </p>
      <p className="mt-2 max-w-2xl text-xs text-muted-foreground">{PENDING_NOTE}</p>

      <div role="tablist" className="mt-8 flex flex-wrap gap-1 rounded-md border border-border p-1">
        {([
          { value: "flyer", label: "Quick flyer upload" },
          { value: "full", label: "Add Full Event" },
        ] as const).map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={tab === option.value}
            onClick={() => setTab(option.value)}
            className={
              "rounded px-4 py-2 text-sm font-semibold " +
              (tab === option.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      {tab === "flyer" ? <QuickFlyerUpload userId={user.id} /> : <FullEventForm userId={user.id} />}
    </div>
  );
}

function SubmittedNote() {
  return (
    <div className="panel mt-8 flex items-center gap-3 border-gold/40 p-4 text-sm" role="status">
      <PartyPopper className="size-5 shrink-0 text-gold" />
      <span>
        Submitted for review! A moderator will approve it shortly, then it appears on the{" "}
        <Link to="/events" className="text-gold underline">events page</Link>.
      </span>
    </div>
  );
}

function QuickFlyerUpload({ userId }: { userId: string }) {
  const [area, setArea] = useState<FlyerArea>("tristate");
  const [flyerTitle, setFlyerTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Choose a flyer image first");
      return;
    }
    setBusy(true);
    setDone(false);
    let path: string;
    try {
      path = await uploadFlyerImage(userId, file);
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Could not upload the flyer image");
      return;
    }
    const { error } = await supabase.from("event_flyers").insert({
      area,
      title: flyerTitle || null,
      storage_path: path,
      event_date: eventDate ? new Date(eventDate).toISOString() : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      created_by: userId,
      is_approved: false,
    });
    setBusy(false);
    if (error) {
      await supabase.storage.from("event-flyers").remove([path]);
      toast.error(error.message || "Could not save the flyer");
      return;
    }
    toast.success("Flyer submitted for review");
    setFlyerTitle("");
    setEventDate("");
    setExpiresAt("");
    setFile(null);
    setDone(true);
  }

  return (
    <>
      {done && <SubmittedNote />}

      <form onSubmit={upload} className="panel mt-8 grid gap-4 p-6">
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
          <Input id="f-title" value={flyerTitle} onChange={(e) => setFlyerTitle(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="f-date">Event date &amp; time (optional)</Label>
          <Input id="f-date" type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
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
            className="file:mr-3 file:rounded file:border-0 file:bg-surface-2 file:px-3 file:py-1 file:text-sm file:text-foreground"
          />
        </div>
        <Button type="submit" disabled={busy} className="justify-self-start">
          <ImagePlus className="size-4" />
          {busy ? "Uploading…" : "Submit flyer"}
        </Button>
      </form>
    </>
  );
}

function FullEventForm({ userId }: { userId: string }) {
  const [form, setForm] = useState({ ...EMPTY_EVENT });
  const [area, setArea] = useState<FlyerArea>("tristate");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const recurring = form.mode === "recurring";
  const startDate = form.starts_at ? new Date(form.starts_at) : null;
  const validStart = startDate && !Number.isNaN(startDate.getTime()) ? startDate : null;
  const weekdayName = validStart ? validStart.toLocaleDateString(undefined, { weekday: "long" }) : "";
  const monthlyOrdinal = validStart
    ? ["first", "second", "third", "fourth", "fifth"][Math.floor((validStart.getDate() - 1) / 7)] ?? "last"
    : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("An event title is required");
      return;
    }
    if (!form.starts_at) {
      toast.error(recurring ? "Pick the first date and time" : "Pick a date and time");
      return;
    }
    if (!file) {
      toast.error("Add your event flyer image");
      return;
    }
    setBusy(true);
    setDone(false);

    let path: string;
    try {
      path = await uploadFlyerImage(userId, file);
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Could not upload the flyer image");
      return;
    }

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        title: form.title.trim(),
        guest: form.guest || null,
        venue: form.venue || null,
        description: form.description || null,
        starts_at: new Date(form.starts_at).toISOString(),
        city: form.city || null,
        state: form.state || null,
        country: form.country || null,
        is_recurring: recurring,
        recurrence_frequency: recurring ? form.frequency : null,
        recurrence_interval: recurring ? Math.max(1, Number(form.interval) || 1) : 1,
        recurrence_until: recurring && form.until ? new Date(form.until).toISOString() : null,
        submitted_by: userId,
        is_approved: false,
      })
      .select("id")
      .single();

    if (error || !event) {
      await supabase.storage.from("event-flyers").remove([path]);
      setBusy(false);
      toast.error("Could not save the event");
      return;
    }

    const { error: flyerError } = await supabase.from("event_flyers").insert({
      area,
      title: form.title.trim(),
      storage_path: path,
      event_date: new Date(form.starts_at).toISOString(),
      created_by: userId,
      event_id: event.id,
      is_approved: false,
    });
    setBusy(false);
    if (flyerError) {
      await supabase.storage.from("event-flyers").remove([path]);
      toast.error(flyerError.message || "Could not save the flyer");
      return;
    }

    toast.success("Event submitted for review");
    setForm({ ...EMPTY_EVENT });
    setFile(null);
    setDone(true);
  }

  return (
    <>
      {done && <SubmittedNote />}

      <form onSubmit={submit} className="panel mt-8 grid gap-4 p-6">
        <h2 className="text-lg">Add an event</h2>
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
                  (form.mode === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="e-date">{recurring ? "First occurrence (date & time)" : "Date & time"}</Label>
            <Input
              id="e-date"
              type="datetime-local"
              required
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            />
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
                  {form.frequency === "custom"
                    ? "Every N days"
                    : `Every N ${form.frequency === "daily" ? "days" : form.frequency === "weekly" ? "weeks" : "months"}`}
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
                <Input
                  id="e-until"
                  type="datetime-local"
                  value={form.until}
                  onChange={(e) => setForm({ ...form, until: e.target.value })}
                />
              </div>
            </div>
          )}
        </fieldset>

        <div className="grid gap-2">
          <Label htmlFor="e-desc">Description</Label>
          <Textarea id="e-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="e-area">Flyer area</Label>
            <Select value={area} onValueChange={(value) => setArea(value as FlyerArea)}>
              <SelectTrigger id="e-area"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FLYER_AREAS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="e-file">Event flyer image</Label>
            <Input
              id="e-file"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="file:mr-3 file:rounded file:border-0 file:bg-surface-2 file:px-3 file:py-1 file:text-sm file:text-foreground"
            />
          </div>
        </div>

        <Button type="submit" disabled={busy} className="justify-self-start">
          <CalendarDays className="size-4" />
          {busy ? "Submitting…" : "Submit event"}
        </Button>
      </form>
    </>
  );
}
