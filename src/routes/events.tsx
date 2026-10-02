import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Star } from "lucide-react";
import { eventsQuery } from "@/lib/station-queries";
import { EventCountdown } from "@/components/widgets/EventCountdown";
import { FlyerWall } from "@/components/widgets/FlyerWall";
import { AdZoneRenderer } from "@/components/ads/AdZoneRenderer";
import { FLYER_AREAS } from "@/lib/station-queries";

const title = "Events & Special Guests — Reggae Vibe Radio";
const description =
  "Upcoming Reggae Vibe Radio events, live sessions and special guest broadcasts, sorted with the next event first.";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: EventsPage,
});

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  guest: string | null;
  venue: string | null;
  starts_at: string;
  city: string | null;
  state: string | null;
  country: string | null;
  is_recurring: boolean;
  recurrence_frequency: string | null;
  recurrence_interval: number;
  recurrence_until: string | null;
};

/** Headline "when" line: a full date & time for one-offs, a plural weekday & time for weekly events. */
function whenLabel(event: EventRow) {
  const start = new Date(event.starts_at);
  const time = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (!event.is_recurring) {
    return start.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }
  const weekday = start.toLocaleDateString(undefined, { weekday: "long" });
  const every = Math.max(1, event.recurrence_interval || 1);
  if (event.recurrence_frequency === "daily") return `Daily${every > 1 ? ` (every ${every} days)` : ""} · ${time}`;
  if (event.recurrence_frequency === "monthly") return `Monthly on ${weekday}s · ${time}`;
  if (event.recurrence_frequency === "custom") return `Every ${every} days · ${time}`;
  return `${weekday}s${every > 1 ? ` (every ${every} weeks)` : ""} · ${time}`;
}

/** Venue followed by the street-level address we hold (city, state, country). */
function placeLabel(event: EventRow) {
  const address = [event.city, event.state, event.country].filter(Boolean).join(", ");
  return [event.venue, address].filter(Boolean).join(" · ");
}

function EventsPage() {
  const { data, isLoading } = useQuery(eventsQuery());
  const now = Date.now();
  const rows = (data ?? []) as unknown as EventRow[];
  const isLive = (e: EventRow) =>
    e.is_recurring ? !e.recurrence_until || new Date(e.recurrence_until).getTime() >= now : new Date(e.starts_at).getTime() >= now;
  const upcoming = rows.filter(isLive);
  const past = rows.filter((e) => !isLive(e)).reverse();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-4xl md:text-5xl">Events</h1>
        <Link
          to="/my-vibe"
          aria-label="Add an event through My Vibe"
          className="group inline-flex items-center no-underline"
        >
          <span className="animate-glow-pulse grid size-9 place-items-center rounded-full border border-gold text-2xl leading-none text-gold transition-colors duration-300 group-hover:bg-gold group-hover:text-gold-foreground">
            +
          </span>
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-display text-2xl text-gold opacity-0 transition-all duration-300 group-hover:ml-3 group-hover:max-w-[8rem] group-hover:opacity-100">
            MY VIBE
          </span>
        </Link>
      </div>
      <p className="mt-3 max-w-2xl text-muted-foreground">Live sessions, clashes and special guests — upcoming first.</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading the calendar…</p>}

          {!isLoading && upcoming.length > 0 && (
            <div className="max-h-[760px] overflow-y-auto overscroll-contain pr-2">
              <div className="space-y-4">
                {upcoming.map((event) => (
                  <article key={event.id} className="panel flex flex-col gap-4 p-5 sm:flex-row">
                    <div className="w-full shrink-0 rounded-lg border border-border bg-surface-2 p-4 text-center sm:w-24">
                      {event.is_recurring ? (
                        <>
                          <p className="text-display text-2xl text-gold">
                            {new Date(event.starts_at).toLocaleDateString(undefined, { weekday: "short" })}
                          </p>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Weekly</p>
                        </>
                      ) : (
                        <>
                          <p className="text-display text-3xl text-gold">{new Date(event.starts_at).getDate()}</p>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            {new Date(event.starts_at).toLocaleString(undefined, { month: "short" })}
                          </p>
                        </>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl">{event.title}</h2>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-gold">
                        <CalendarDays className="size-4" />
                        {whenLabel(event)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {placeLabel(event) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" /> {placeLabel(event)}
                          </span>
                        )}
                        {event.guest && (
                          <span className="inline-flex items-center gap-1 text-gold">
                            <Star className="size-3.5" /> {event.guest}
                          </span>
                        )}
                      </div>
                      {event.description && <p className="mt-3 text-sm text-muted-foreground">{event.description}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {!isLoading && upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground">No upcoming events announced yet.</p>
          )}

          {past.length > 0 && (
            <section className="panel p-5">
              <h2 className="text-lg">Past events</h2>
              <ul className="mt-3 divide-y divide-border text-sm">
                {past.map((event) => (
                  <li key={event.id} className="flex justify-between gap-4 py-2 text-muted-foreground">
                    <span>{event.title}</span>
                    <time dateTime={event.starts_at}>{new Date(event.starts_at).toLocaleDateString()}</time>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className="grid content-start gap-6">
          <EventCountdown />
          <AdZoneRenderer pageTarget="events" positionKey="right_column" />
        </aside>
      </div>

      <div className="mt-14 space-y-8">
        <div>
          <h2 className="text-3xl md:text-4xl">Event flyers</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            The latest flyers dropping across every area we run with — Tristate, DMV, New York, Florida and Jamaica.
          </p>
        </div>
        {FLYER_AREAS.map((area) => (
          <FlyerWall key={area.value} area={area.value} label={area.label} />
        ))}
      </div>
    </div>
  );
}
