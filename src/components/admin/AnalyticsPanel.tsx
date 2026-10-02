import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Headphones, Music4, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ANALYTICS_PERIODS,
  formatRange,
  listenerStatsQuery,
  monthLabel,
  monthRange,
  monthlyTrackStatsQuery,
  resolvePeriod,
  trackReportQuery,
  type AnalyticsPeriod,
} from "@/lib/analytics-queries";

function usePeriodControls() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("this_week");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const range = useMemo(() => resolvePeriod(period, from, to), [period, from, to]);
  return { period, setPeriod, from, setFrom, to, setTo, range };
}

function PeriodBar({
  idPrefix,
  controls,
}: {
  idPrefix: string;
  controls: ReturnType<typeof usePeriodControls>;
}) {
  const { period, setPeriod, from, setFrom, to, setTo, range } = controls;
  return (
    <div className="grid gap-4 border-b border-border px-5 py-4 sm:grid-cols-[minmax(0,12rem)_1fr_1fr]">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-period`}>Period</Label>
        <Select value={period} onValueChange={(value) => setPeriod(value as AnalyticsPeriod)}>
          <SelectTrigger id={`${idPrefix}-period`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {ANALYTICS_PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-from`}>From date</Label>
        <Input
          id={`${idPrefix}-from`}
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPeriod("custom");
          }}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-to`}>To date</Label>
        <Input
          id={`${idPrefix}-to`}
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPeriod("custom");
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-3">Showing {formatRange(range)}</p>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-1 text-display text-2xl text-gold">{value}</p>
    </div>
  );
}

function ListenersTab() {
  const controls = usePeriodControls();
  const { data, isLoading, error } = useQuery(listenerStatsQuery(controls.range));
  const rows = data ?? [];
  const totals = rows.reduce(
    (acc, r) => ({ listeners: acc.listeners + Number(r.listeners), signed_in: acc.signed_in + Number(r.signed_in), pings: acc.pings + Number(r.pings) }),
    { listeners: 0, signed_in: 0, pings: 0 },
  );
  const peak = rows.reduce((max, r) => Math.max(max, Number(r.listeners)), 0);

  return (
    <section className="panel overflow-hidden">
      <PeriodBar idPrefix="lst" controls={controls} />
      {error ? (
        <p className="p-5 text-sm text-destructive">Listener data could not be loaded.</p>
      ) : isLoading ? (
        <p className="p-5 text-sm text-muted-foreground">Loading listener data…</p>
      ) : (
        <>
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            <Stat icon={<Headphones className="size-3.5" />} label="Listener sessions" value={totals.listeners} />
            <Stat icon={<Users className="size-3.5" />} label="Signed-in listeners" value={totals.signed_in} />
            <Stat icon={<Headphones className="size-3.5" />} label="Peak day" value={peak} />
          </div>
          {!rows.length ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">No listening activity recorded for this period.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {rows.map((row) => (
                <li key={row.day} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-sm font-semibold">{new Date(`${row.day}T00:00:00`).toLocaleDateString()}</span>
                  <div className="ml-auto flex items-center gap-6 text-xs text-muted-foreground">
                    <span><strong className="text-foreground">{row.listeners}</strong> listeners</span>
                    <span><strong className="text-foreground">{row.signed_in}</strong> signed in</span>
                    <span><strong className="text-foreground">{row.pings}</strong> minutes tuned</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function TrackTable({ range }: { range: { from: Date; to: Date } }) {
  const { data, isLoading, error } = useQuery(trackReportQuery(range));
  const rows = data ?? [];

  if (error) return <p className="p-5 text-sm text-destructive">Track report could not be loaded.</p>;
  if (isLoading) return <p className="p-5 text-sm text-muted-foreground">Loading track report…</p>;
  if (!rows.length) return <p className="p-5 text-sm text-muted-foreground">No tracks were played in this period.</p>;

  return (
    <div className="max-h-[32rem] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left">Track</th>
            <th className="px-4 py-2 text-left">Category</th>
            <th className="px-4 py-2 text-right">Plays</th>
            <th className="px-4 py-2 text-right">Votes</th>
            <th className="px-4 py-2 text-right">Last played</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.track_id}>
              <td className="max-w-[18rem] px-4 py-2">
                <p className="truncate font-semibold">{row.title}</p>
                <p className="truncate text-xs text-muted-foreground">{row.artist}</p>
              </td>
              <td className="px-4 py-2 text-xs uppercase text-muted-foreground">{row.category}</td>
              <td className="px-4 py-2 text-right font-bold tabular-nums">{row.plays}</td>
              <td className="px-4 py-2 text-right tabular-nums">{row.votes}</td>
              <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                {row.last_play ? new Date(row.last_play).toLocaleString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrackReportsTab() {
  const controls = usePeriodControls();
  return (
    <section className="panel overflow-hidden">
      <PeriodBar idPrefix="trk" controls={controls} />
      <TrackTable range={controls.range} />
    </section>
  );
}

function MonthlyTracksTab() {
  const { data, isLoading, error } = useQuery(monthlyTrackStatsQuery());
  const months = data ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const activeMonth = selected ?? months[0]?.month ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr]">
      <section className="panel overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-lg">Monthly records</h3>
          <p className="text-xs text-muted-foreground">Every month since the stream started — new months appear automatically.</p>
        </div>
        {error ? (
          <p className="p-5 text-sm text-destructive">Monthly records could not be loaded.</p>
        ) : isLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Loading months…</p>
        ) : (
          <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto">
            {months.map((m) => (
              <li key={m.month}>
                <button
                  type="button"
                  onClick={() => setSelected(m.month)}
                  className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-secondary ${
                    activeMonth === m.month ? "bg-secondary" : ""
                  }`}
                >
                  <span className="flex-1 text-sm font-semibold">{monthLabel(m.month)}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.plays} plays · {m.unique_tracks} tracks · {m.votes} votes
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Music4 className="size-4 text-gold" />
          <h3 className="text-lg">{activeMonth ? monthLabel(activeMonth) : "Monthly tracks"}</h3>
        </div>
        {activeMonth ? (
          <TrackTable range={monthRange(activeMonth)} />
        ) : (
          <p className="p-5 text-sm text-muted-foreground">No monthly records yet.</p>
        )}
      </section>
    </div>
  );
}

export function AnalyticsPanel() {
  return (
    <Tabs defaultValue="listeners">
      <TabsList className="flex flex-wrap">
        <TabsTrigger value="listeners">Listeners</TabsTrigger>
        <TabsTrigger value="tracks">Track reports</TabsTrigger>
        <TabsTrigger value="monthly">Monthly tracks</TabsTrigger>
      </TabsList>
      <TabsContent value="listeners" className="pt-6"><ListenersTab /></TabsContent>
      <TabsContent value="tracks" className="pt-6"><TrackReportsTab /></TabsContent>
      <TabsContent value="monthly" className="pt-6"><MonthlyTracksTab /></TabsContent>
    </Tabs>
  );
}
