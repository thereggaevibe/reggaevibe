import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock3, Mic2 } from "lucide-react";
import { DAY_NAMES, formatTime, showsQuery, splitCurrentUpcoming } from "@/lib/station-queries";
import { showKey, slotsByShow, sourcedShows, type ShowItem } from "@/lib/shows-data";
import { ShowScheduleButton } from "@/components/site/ShowScheduleButton";
import { stationLogoAsset } from "@/lib/site-images";

export function CurrentShowFeature() {
  const { data } = useQuery(showsQuery());
  const shows: ShowItem[] = (data?.length ? (data as unknown as ShowItem[]) : sourcedShows);
  const { current, upcoming } = splitCurrentUpcoming(shows);
  const show = current ?? upcoming[0] ?? null;
  const live = Boolean(current);

  return (
    <section className="panel rounded-xl p-5 md:p-8">
      <p className="text-xs font-extrabold uppercase tracking-widest text-rasta-red">
        {live ? "On air right now" : "Up next on the station"}
      </p>
      <h2 className="mt-1 text-4xl md:text-6xl">{live ? "Current Show" : "Next Show"}</h2>

      {!show ? (
        <p className="mt-6 border-t border-border pt-6 text-muted-foreground">
          Non-stop positive reggae music is playing — no hosted show scheduled right now.
        </p>
      ) : (
        <div className="mt-7 grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <img
            src={show.image_url ?? stationLogoAsset.url}
            alt={`${show.title} show artwork`}
            width={1200}
            height={720}
            className="aspect-[16/10] w-full rounded-2xl border border-border object-cover shadow-lift"
          />
          <div className="min-w-0">
            {live && (
              <span className="inline-flex items-center gap-2 rounded-full bg-rasta-red/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-rasta-red">
                <span className="size-1.5 rounded-full bg-rasta-red" style={{ animation: "pulse-live 1.6s ease-in-out infinite" }} />
                Live
              </span>
            )}
            <h3 className="mt-3 text-3xl md:text-5xl">{show.title}</h3>
            <ul className="mt-4 grid gap-2 text-sm">
              <li className="flex items-center gap-2 text-gold">
                <Clock3 className="size-4" /> <span className="font-extrabold">{formatTime(show.start_time)} – {formatTime(show.end_time)}</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-4 text-gold" /> {DAY_NAMES[show.day_of_week]}
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mic2 className="size-4 text-gold" /> {show.djs?.name ?? "Reggae Vibe Selectors"}
              </li>
            </ul>
            <ShowScheduleButton slots={slotsByShow(shows).get(showKey(show)) ?? []} className="mt-4 max-w-xs" />
            {show.description && <p className="mt-4 text-sm text-muted-foreground md:text-base">{show.description}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
