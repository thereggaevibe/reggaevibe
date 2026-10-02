import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin } from "lucide-react";
import { eventsQuery } from "@/lib/station-queries";

function useCountdown(target: string | undefined) {
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = Math.max(0, new Date(target).getTime() - Date.now());
      setParts({
        d: Math.floor(diff / 86_400_000),
        h: Math.floor((diff / 3_600_000) % 24),
        m: Math.floor((diff / 60_000) % 60),
        s: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);
  return parts;
}

export function EventCountdown() {
  const { data } = useQuery(eventsQuery());
  const next = (data ?? []).find((e) => new Date(e.starts_at).getTime() > Date.now());
  const { d, h, m, s } = useCountdown(next?.starts_at);

  if (!next) {
    return (
      <section className="panel p-5">
        <h2 className="text-lg">Next event</h2>
        <p className="mt-2 text-sm text-muted-foreground">No events on the calendar yet. Check back soon.</p>
      </section>
    );
  }

  const cells = [
    { label: "days", value: d },
    { label: "hrs", value: h },
    { label: "min", value: m },
    { label: "sec", value: s },
  ];

  return (
    <section className="panel overflow-hidden">
      <div className="rasta-stripe h-1 w-full" />
      <div className="p-5">
        <h2 className="text-lg">Next event</h2>
        <p className="mt-1 text-display text-2xl text-gold">{next.title}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {new Date(next.starts_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </span>
          {next.venue && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" /> {next.venue}
            </span>
          )}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {cells.map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-surface-2 py-3 text-center">
              <p className="text-display text-2xl tabular-nums text-foreground">{String(c.value).padStart(2, "0")}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
