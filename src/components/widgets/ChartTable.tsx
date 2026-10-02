import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HeartVoteButton } from "@/components/ui/HeartVoteButton";
import { chartQuery, releaseYearsQuery, type ChartWindow } from "@/lib/station-queries";
import { useRadio } from "@/components/player/radio-provider";
import { stationLogoAsset } from "@/lib/site-images";

const stationLogo = stationLogoAsset.url;

type Props = {
  title: string;
  subtitle?: string;
  category: "reggae" | "dancehall" | "all";
  limit: number;
  currentYearOnly?: boolean;
  window?: ChartWindow;
  /** Shows a release-year dropdown so listeners can browse other years. */
  yearFilter?: boolean;
  /** Caps the visible list height so extra rows scroll instead of stretching the page. */
  scrollAfter?: number;
};

export function ChartTable({ title, subtitle, category, limit, currentYearOnly = false, window = "week", yearFilter = false, scrollAfter }: Props) {
  const [year, setYear] = useState<string>("current");
  const selectedYear = yearFilter && year !== "current" && year !== "all" ? Number(year) : null;
  const restrictToCurrentYear = yearFilter ? year === "current" && currentYearOnly : currentYearOnly;
  const { data, isLoading } = useQuery(chartQuery(category, limit, restrictToCurrentYear, window, selectedYear));
  const { data: years } = useQuery({ ...releaseYearsQuery(), enabled: yearFilter });
  const { voteForTrack, votedTrackIds } = useRadio();

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-xl">{title}</h2>
          {subtitle && <p className="text-xs uppercase tracking-widest text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {yearFilter && (
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by release year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">{new Date().getFullYear()} releases</SelectItem>
                <SelectItem value="all">All years</SelectItem>
                {(years ?? [])
                  .filter((y) => y !== new Date().getFullYear())
                  .map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest text-gold">
            {window === "month" ? "Monthly votes" : "Weekly votes"}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="p-5 text-sm text-muted-foreground">Counting the votes…</div>
      ) : !data?.length ? (
        <div className="p-5 text-sm text-muted-foreground">No votes in this chart yet — be the first to vote.</div>
      ) : (
        <ol
          className="divide-y divide-border"
          style={scrollAfter ? { maxHeight: `${scrollAfter * 4.625}rem`, overflowY: "auto" } : undefined}
        >
          {data.map((row, i) => {
            const voted = votedTrackIds.includes(row.track_id);
            return (
              <li key={row.track_id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-7 text-center text-display text-lg text-gold">{i + 1}</span>
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
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-bold">{window === "month" ? row.votes_month : row.votes_week}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {window === "month" ? "this month" : "this week"}
                  </p>
                </div>
                <HeartVoteButton
                  voted={voted}
                  label={`Vote for ${row.title}`}
                  onVote={() => voteForTrack(row.track_id)}
                />
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
