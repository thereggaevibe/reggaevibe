import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mic2 } from "lucide-react";
import { showsQuery } from "@/lib/station-queries";
import { sourcedShows, type ShowItem } from "@/lib/shows-data";
import { ShowScheduleButton } from "@/components/site/ShowScheduleButton";
import { stationLogoAsset } from "@/lib/site-images";


const title = "Radio Shows — Reggae Vibe Radio";
const description =
  "Browse every Reggae Vibe Radio show: hosts, broadcast days and airtimes for the full weekly roots, culture and dancehall line-up.";

export const Route = createFileRoute("/shows")({
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
  component: ShowsPage,
});

type Slot = { day_of_week: number; start_time: string; end_time: string };
type ShowGroup = ShowItem & { slots: Slot[] };

function groupShows(shows: ShowItem[]): ShowGroup[] {
  const groups = new Map<string, ShowGroup>();
  for (const show of shows) {
    const key = `${show.title.trim().toLowerCase()}|${(show.djs?.name ?? "").trim().toLowerCase()}`;
    const slot: Slot = { day_of_week: show.day_of_week, start_time: show.start_time, end_time: show.end_time };
    const existing = groups.get(key);
    if (existing) {
      existing.slots.push(slot);
      if (!existing.image_url && show.image_url) existing.image_url = show.image_url;
      if (!existing.description && show.description) existing.description = show.description;
    } else {
      groups.set(key, { ...show, slots: [slot] });
    }
  }
  const byTime = (a: Slot, b: Slot) =>
    a.day_of_week === b.day_of_week ? a.start_time.localeCompare(b.start_time) : a.day_of_week - b.day_of_week;
  const list = [...groups.values()];
  for (const group of list) group.slots.sort(byTime);
  return list.sort((a, b) => byTime(a.slots[0]!, b.slots[0]!));
}

function AirtimesMenu({ slots }: { slots: Slot[] }) {
  if (!slots.length) return null;
  return (
    <ShowScheduleButton
      slots={slots}
      label={slots.length === 1 ? "Schedule" : `Schedule · ${slots.length} airtimes`}
      className="mt-2"
    />
  );
}

function ShowsPage() {
  const { data } = useQuery(showsQuery());
  const shows: ShowItem[] = data?.length ? (data as unknown as ShowItem[]) : sourcedShows;
  const grouped = groupShows(shows);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <p className="text-xs font-extrabold uppercase tracking-widest text-rasta-red">The full line-up</p>
      <h1 className="mt-1 text-5xl md:text-7xl">Reggae Vibe Radio Shows</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Every show on the station, from sunrise meditation music to late-night dancehall juggling.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {grouped.map((show) => (
          <article key={show.id} className="group relative rounded-xl border border-border bg-surface">
            <img
              src={show.image_url ?? stationLogoAsset.url}
              alt={`${show.title} show artwork`}
              width={640}
              height={400}
              loading="lazy"
              className="aspect-[16/10] w-full rounded-t-xl object-cover"
            />
            <div className="p-5">
              <h2 className="text-2xl md:text-3xl">{show.title}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Mic2 className="size-4 text-gold" /> {show.djs?.name ?? "Reggae Vibe Selectors"}
              </p>
              <AirtimesMenu slots={show.slots} />
              {show.description && <p className="mt-3 text-sm text-muted-foreground">{show.description}</p>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );

}
