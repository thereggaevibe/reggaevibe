import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { DAY_NAMES, formatTime, showsQuery, splitCurrentUpcoming } from "@/lib/station-queries";

export function OnAirWidget() {
  const { data: shows } = useQuery(showsQuery());
  const { current, upcoming } = splitCurrentUpcoming(shows ?? []);

  return (
    <section className="panel p-5">
      <h2 className="text-lg">On air now</h2>
      {current ? (
        <div className="mt-3">
          <p className="text-display text-2xl text-gold">{current.title}</p>
          <p className="text-sm text-muted-foreground">
            {current.djs?.name ? `with ${current.djs.name} · ` : ""}
            {formatTime(current.start_time)} – {formatTime(current.end_time)}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Non-stop music selection — no host scheduled right now.</p>
      )}

      <h3 className="mt-6 text-xs tracking-widest text-muted-foreground">Coming up</h3>
      <ul className="mt-2 divide-y divide-border">
        {upcoming.length === 0 && <li className="py-2 text-sm text-muted-foreground">Schedule refreshing soon.</li>}
        {upcoming.map((show) => (
          <li key={show.id} className="flex items-center gap-3 py-2">
            <Clock className="size-4 shrink-0 text-gold" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{show.title}</p>
              <p className="text-xs text-muted-foreground">
                {DAY_NAMES[show.day_of_week]} · {formatTime(show.start_time)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
