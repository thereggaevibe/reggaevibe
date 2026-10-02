import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { OnAirWidget } from "@/components/widgets/OnAirWidget";
import { DAY_NAMES, formatTime, showsQuery } from "@/lib/station-queries";

const title = "Programme Schedule — Reggae Vibe Radio";
const description =
  "See what's on air now and the full weekly Reggae Vibe Radio schedule of shows, hosts and broadcast times.";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { data: shows, isLoading } = useQuery(showsQuery());
  const today = new Date().getDay();
  const ordered = [...Array(7).keys()].map((i) => (today + i) % 7);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-4xl md:text-5xl">Schedule</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Daily and weekly programmes, all times in your local timezone offset.</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading the schedule…</p>}
          {ordered.map((day) => {
            const list = (shows ?? []).filter((s) => s.day_of_week === day);
            if (!list.length) return null;
            return (
              <section key={day} className="panel overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <h2 className="text-lg">{DAY_NAMES[day]}</h2>
                  {day === today && <span className="text-[10px] font-bold uppercase tracking-widest text-gold">Today</span>}
                </div>
                <ul className="divide-y divide-border">
                  {list.map((show) => (
                    <li key={show.id} className="flex items-center gap-4 px-5 py-3">
                      <span className="w-32 shrink-0 text-xs font-bold uppercase tracking-wider text-gold">
                        {formatTime(show.start_time)} – {formatTime(show.end_time)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{show.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {show.djs?.name ? `with ${show.djs.name}` : "Non-stop selection"}
                          {show.description ? ` · ${show.description}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <aside className="space-y-6">
          <OnAirWidget />
        </aside>
      </div>
    </div>
  );
}
