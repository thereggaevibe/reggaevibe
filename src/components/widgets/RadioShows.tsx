import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DAY_NAMES, formatTime, showsQuery } from "@/lib/station-queries";
import { stationLogoAsset } from "@/lib/site-images";
import { sourcedShows } from "@/lib/shows-data";

export function RadioShows() {
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(today);
  const { data } = useQuery(showsQuery());
  const allShows = data?.length ? data : sourcedShows;
  const selected = useMemo(() => allShows.filter((show) => show.day_of_week === selectedDay), [allShows, selectedDay]);

  return (
    <section className="panel relative p-5 md:p-8">
      <div className="relative flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-rasta-red">On air all week</p>
          <h2 className="mt-1 text-5xl md:text-7xl">Radio Shows</h2>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">Select a day and discover the voices, selectors and sounds taking over the station.</p>
      </div>
      <div className="relative mt-7 grid grid-cols-4 gap-2 md:grid-cols-7">
        {DAY_NAMES.map((day, index) => (
          <Button
            key={day}
            variant={selectedDay === index ? "default" : "secondary"}
            className="min-w-0 px-2 uppercase"
            onClick={() => setSelectedDay(index)}
          >
            <span className="hidden sm:inline">{day}</span><span className="sm:hidden">{day.slice(0, 3)}</span>
          </Button>
        ))}
      </div>
      <div
        key={selectedDay}
        className="mt-6 grid max-h-[38rem] animate-schedule-in gap-3 overflow-y-auto rounded-xl border border-border bg-background/40 pr-2"
      >
        {selected.length ? selected.map((show, index) => (
          <article key={show.id} className="show-row grid items-center gap-4 border-t border-border px-4 py-4 first:border-t-0 sm:grid-cols-[104px_1fr_auto]" style={{ animationDelay: `${index * 70}ms` }}>
            <img src={show.image_url ?? stationLogoAsset.url} alt={`${show.title} show`} width={208} height={136} loading="lazy" className="h-20 w-28 rounded-md object-cover" />
            <div className="min-w-0">
              <h3 className="text-2xl md:text-3xl">{show.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{show.djs?.name ? `with ${show.djs.name}` : "Non-stop selection"}</p>
            </div>
            <p className="flex items-center gap-2 text-sm font-extrabold text-gold"><Clock3 className="size-4" /> {formatTime(show.start_time)} – {formatTime(show.end_time)}</p>
          </article>
        )) : <p className="px-4 py-8 text-muted-foreground">Non-stop positive reggae music fills this day.</p>}
      </div>
      <div className="relative mt-8 flex justify-center border-t border-border pt-6">
        <Button asChild size="lg" className="uppercase">
          <Link to="/schedule">View the full weekly schedule</Link>
        </Button>
      </div>
    </section>
  );
}