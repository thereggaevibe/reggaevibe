import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HeartVoteButton } from "@/components/ui/HeartVoteButton";
import { Button } from "@/components/ui/button";
import { DAY_NAMES, recentlyPlayedQuery } from "@/lib/station-queries";
import { useRadio } from "@/components/player/radio-provider";
import { stationLogoAsset } from "@/lib/site-images";

export function WeeklyRecentlyPlayed() {
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(today);
  const { data, isLoading } = useQuery(recentlyPlayedQuery(7, 400));
  const { voteForTrack, votedTrackIds } = useRadio();

  const plays = useMemo(
    () => (data ?? []).filter((play) => new Date(play.played_at).getDay() === selectedDay),
    [data, selectedDay],
  );

  return (
    <section className="panel relative overflow-hidden rounded-xl p-5 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-rasta-red">Recently played</p>
          <h2 className="mt-1 max-w-2xl text-4xl leading-[0.95] md:text-6xl">The Best Reggae Roots &amp; Dancehall</h2>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          Pick a day of the week to see everything that aired, with airtime — and vote for the tunes you love.
        </p>
      </div>

      <div className="mt-7 grid grid-cols-4 gap-2 md:grid-cols-7">
        {DAY_NAMES.map((day, index) => (
          <Button
            key={day}
            variant={selectedDay === index ? "default" : "secondary"}
            className="min-w-0 px-2 uppercase"
            onClick={() => setSelectedDay(index)}
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.slice(0, 3)}</span>
          </Button>
        ))}
      </div>

      <div
        key={selectedDay}
        className="mt-6 grid max-h-[640px] animate-schedule-in gap-3 overflow-y-auto rounded-xl border border-border bg-background/40 px-4 pb-2"
      >

        {isLoading ? (
          <p className="border-t border-border py-8 text-muted-foreground">Loading the play history…</p>
        ) : !plays.length ? (
          <p className="border-t border-border py-8 text-muted-foreground">Nothing logged for {DAY_NAMES[selectedDay]} yet.</p>
        ) : (
          plays.map((play, index) => {
            const track = play.tracks;
            if (!track) return null;
            const voted = votedTrackIds.includes(track.id);
            return (
              <article
                key={play.id}
                className="show-row flex items-center gap-4 border-t border-border py-4"
                style={{ animationDelay: `${Math.min(index, 10) * 60}ms` }}
              >
                <img
                  src={track.artwork_url ?? stationLogoAsset.url}
                  alt={`${track.title} artwork`}
                  width={112}
                  height={112}
                  loading="lazy"
                  className="size-16 rounded-md border border-border object-cover md:size-20"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-extrabold md:text-xl">{track.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{track.artist || "Unknown artist"}</p>
                </div>
                <time className="shrink-0 text-sm font-extrabold text-gold" dateTime={play.played_at}>
                  {new Date(play.played_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </time>
                <HeartVoteButton voted={voted} label={`Vote for ${track.title}`} onVote={() => voteForTrack(track.id)} />
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
