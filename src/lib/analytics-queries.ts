import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ANALYTICS_PERIODS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "yesterday", label: "Yesterday" },
  { value: "prev_week", label: "Previous Week" },
  { value: "prev_month", label: "Previous Month" },
  { value: "custom", label: "Custom range" },
] as const;

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number]["value"];

const DAY = 86_400_000;

function startOfDay(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfWeek(d: Date) {
  const out = startOfDay(d);
  out.setDate(out.getDate() - out.getDay()); // week starts Sunday
  return out;
}

export function resolvePeriod(period: AnalyticsPeriod, from?: string, to?: string) {
  const now = new Date();
  switch (period) {
    case "today": {
      const start = startOfDay(now);
      return { from: start, to: new Date(start.getTime() + DAY) };
    }
    case "yesterday": {
      const start = new Date(startOfDay(now).getTime() - DAY);
      return { from: start, to: new Date(start.getTime() + DAY) };
    }
    case "this_week": {
      const start = startOfWeek(now);
      return { from: start, to: new Date(start.getTime() + 7 * DAY) };
    }
    case "prev_week": {
      const start = new Date(startOfWeek(now).getTime() - 7 * DAY);
      return { from: start, to: new Date(start.getTime() + 7 * DAY) };
    }
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: start, to: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
    }
    case "prev_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: start, to: new Date(now.getFullYear(), now.getMonth(), 1) };
    }
    case "custom":
    default: {
      const start = from ? startOfDay(new Date(from)) : startOfDay(now);
      const end = to ? new Date(startOfDay(new Date(to)).getTime() + DAY) : new Date(start.getTime() + DAY);
      return { from: start, to: end };
    }
  }
}

export function formatRange(range: { from: Date; to: Date }) {
  const last = new Date(range.to.getTime() - 1);
  return `${range.from.toLocaleDateString()} – ${last.toLocaleDateString()}`;
}

export const listenerStatsQuery = (range: { from: Date; to: Date }) =>
  queryOptions({
    queryKey: ["listener-stats", range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listener_stats", {
        _from: range.from.toISOString(),
        _to: range.to.toISOString(),
      });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

export const trackReportQuery = (range: { from: Date; to: Date }) =>
  queryOptions({
    queryKey: ["track-report", range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("track_report", {
        _from: range.from.toISOString(),
        _to: range.to.toISOString(),
      });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

export const monthlyTrackStatsQuery = () =>
  queryOptions({
    queryKey: ["monthly-track-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("monthly_track_stats");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300_000,
  });

export function monthLabel(month: string) {
  return new Date(`${month}T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function monthRange(month: string) {
  const from = new Date(`${month}T00:00:00`);
  return { from, to: new Date(from.getFullYear(), from.getMonth() + 1, 1) };
}
