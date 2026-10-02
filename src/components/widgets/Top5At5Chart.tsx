import { useQuery } from "@tanstack/react-query";
import { HeartVoteButton } from "@/components/ui/HeartVoteButton";
import { top5At5Query, type Top5At5Row } from "@/lib/station-queries";
import { useRadio } from "@/components/player/radio-provider";
import { stationLogoAsset } from "@/lib/site-images";

const stationLogo = stationLogoAsset.url;

function Standings({ row }: { row: Top5At5Row }) {
  return (
    <div className="text-right leading-tight">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gold">
        LW {row.last_week ?? "—"} <span className="text-muted-foreground">|</span> WOC {row.weeks_on_chart}
        {row.weeks_at_one > 0 && (
          <>
            {" "}
            <span className="text-muted-foreground">|</span> {row.weeks_at_one} WKS @ #1
          </>
        )}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{row.votes_week} votes this week</p>
    </div>
  );
}

export function Top5At5Chart() {
  const { data, isLoading } = useQuery(top5At5Query());
  const { voteForTrack, votedTrackIds } = useRadio();

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-xl">Top 5 @5 Chart</h2>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Listen Daily 5pm est. on Reggae Vibe Radio · Reggae &amp; Dancehall combined
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-gold">Weekly standings</span>
      </div>

      {isLoading ? (
        <div className="p-5 text-sm text-muted-foreground">Counting the votes…</div>
      ) : !data?.length ? (
        <div className="p-5 text-sm text-muted-foreground">No votes in this chart yet — be the first to vote.</div>
      ) : (
        <ol className="divide-y divide-border">
          {data.map((row) => (
            <li key={row.track_id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-7 text-center text-display text-lg text-gold">{row.chart_position}</span>
              <img
                src={row.artwork_url ?? stationLogo}
                alt={`${row.title} artwork`}
                width={44}
                height={44}
                loading="lazy"
                className="size-11 rounded-md border border-border object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{row.title}</p>
                <p className="truncate text-xs text-muted-foreground">{row.artist || "Unknown artist"}</p>
              </div>
              <div className="hidden sm:block">
                <Standings row={row} />
              </div>
              <HeartVoteButton
                voted={votedTrackIds.includes(row.track_id)}
                label={`Vote for ${row.title}`}
                onVote={() => voteForTrack(row.track_id)}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
