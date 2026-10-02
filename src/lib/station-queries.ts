import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTop5At5 } from "@/lib/charts.functions";

export type ChartRow = {
  track_id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  category: "reggae" | "dancehall" | "other";
  release_year: number | null;
  play_count: number;
  last_played_at: string | null;
  votes_week: number;
  votes_month: number;
  votes_all_time: number;
};

export type ChartWindow = "week" | "month";

export type Top5At5Row = {
  track_id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  category: "reggae" | "dancehall" | "other";
  votes_week: number;
  chart_position: number;
  last_week: number | null;
  weeks_on_chart: number;
  weeks_at_one: number;
};

/** Combined Reggae + Dancehall top 5 for the week, with week-over-week standings. */
export const top5At5Query = (currentYearOnly = true) =>
  queryOptions({
    queryKey: ["top5-at5", currentYearOnly],
    queryFn: async (): Promise<Top5At5Row[]> => {
      const data = await getTop5At5({ data: { currentYearOnly } });
      return (data ?? []) as unknown as Top5At5Row[];
    },
    staleTime: 60_000,
  });


export const releaseYearsQuery = () =>
  queryOptions({
    queryKey: ["release-years"],
    queryFn: async (): Promise<number[]> => {
      const { data, error } = await supabase
        .from("tracks")
        .select("release_year")
        .not("release_year", "is", null)
        .order("release_year", { ascending: false });
      if (error) throw error;
      return [...new Set((data ?? []).map((row) => row.release_year as number))];
    },
    staleTime: 300_000,
  });

export const chartQuery = (
  category: "reggae" | "dancehall" | "all",
  limit: number,
  currentYearOnly = false,
  window: ChartWindow = "week",
  releaseYear: number | null = null,
) =>
  queryOptions({
    queryKey: ["chart", category, limit, currentYearOnly, window, releaseYear],
    queryFn: async (): Promise<ChartRow[]> => {
      let q = supabase
        .from("track_vote_stats")
        .select("*")
        .order(window === "month" ? "votes_month" : "votes_week", { ascending: false })
        .order("play_count", { ascending: false })
        .limit(limit);
      if (category !== "all") q = q.eq("category", category);
      q = q.eq("excluded", false);
      if (releaseYear) q = q.eq("release_year", releaseYear);

      else if (currentYearOnly) q = q.eq("release_year", new Date().getFullYear());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ChartRow[];
    },
    staleTime: 60_000,
  });

export const recentlyPlayedQuery = (days = 7, limit = 200) =>
  queryOptions({
    queryKey: ["recently-played", days, limit],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("plays")
        .select("id, played_at, tracks!inner(id, title, artist, artwork_url, category, excluded)")
        .eq("tracks.excluded", false)
        .gte("played_at", since)
        .order("played_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },

    staleTime: 30_000,
  });

export const djsQuery = () =>
  queryOptions({
    queryKey: ["djs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("djs")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300_000,
  });

export const showsQuery = () =>
  queryOptions({
    queryKey: ["shows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shows")
        .select("*, djs(name, photo_url)")
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300_000,
  });

export const eventsQuery = (approvedOnly = true) =>
  queryOptions({
    queryKey: ["events", approvedOnly],
    queryFn: async () => {
      let query = supabase.from("events").select("*").order("starts_at", { ascending: true });
      if (approvedOnly) query = query.eq("is_approved", true);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 120_000,
  });

export type PendingSubmission = {
  event: null | {
    id: string;
    title: string;
    guest: string | null;
    venue: string | null;
    description: string | null;
    starts_at: string;
    city: string | null;
    state: string | null;
    country: string | null;
    is_recurring: boolean;
    is_approved: boolean;
  };
  flyer: (Flyer & { is_approved: boolean }) | null;
};

/** Front-end submissions awaiting moderation: event pending, flyer pending, or both. */
export const pendingSubmissionsQuery = () =>
  queryOptions({
    queryKey: ["event-submissions"],
    queryFn: async (): Promise<PendingSubmission[]> => {
      const { data: events, error } = await supabase
        .from("events")
        .select("*")
        .not("submitted_by", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: flyers, error: flyerError } = await supabase
        .from("event_flyers")
        .select("id, title, area, storage_path, event_date, expires_at, created_at, is_approved, event_id")
        .not("created_by", "is", null)
        .order("created_at", { ascending: false });
      if (flyerError) throw flyerError;

      const rows = flyers ?? [];
      const urls = new Map<string, string>();
      if (rows.length) {
        const { data: signed } = await supabase.storage
          .from("event-flyers")
          .createSignedUrls(rows.map((r) => r.storage_path), 60 * 60 * 6);
        (signed ?? []).forEach((s) => urls.set(s.path ?? "", s.signedUrl ?? ""));
      }

      const byEvent = new Map(rows.filter((r) => r.event_id).map((r) => [r.event_id as string, r]));
      const submissions: PendingSubmission[] = (events ?? [])
        .map((event) => {
          const row = byEvent.get(event.id);
          return {
            event: event as unknown as PendingSubmission["event"],
            flyer: row
              ? ({ ...row, url: urls.get(row.storage_path) ?? "" } as unknown as PendingSubmission["flyer"])
              : null,
          };
        })
        .filter((s) => !s.event!.is_approved || (s.flyer && !s.flyer.is_approved));

      // Standalone member flyer uploads with no event attached.
      rows
        .filter((r) => !r.event_id && !r.is_approved)
        .forEach((r) => {
          submissions.push({
            event: null,
            flyer: { ...r, url: urls.get(r.storage_path) ?? "" } as unknown as PendingSubmission["flyer"],
          });
        });

      return submissions;
    },
    staleTime: 30_000,
  });


export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function formatTime(value: string) {
  const [h, m] = value.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${suffix}`;
}

type ShowLike = { day_of_week: number; start_time: string; end_time: string };

export function splitCurrentUpcoming<T extends ShowLike>(shows: T[]) {
  const now = new Date();
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

  const today = shows.filter((s) => s.day_of_week === day).sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
  const current = today.find((s) => toMinutes(s.start_time) <= minutes && toMinutes(s.end_time) > minutes) ?? null;
  const upcoming = today.filter((s) => toMinutes(s.start_time) > minutes).slice(0, 3);
  const rest = upcoming.length
    ? upcoming
    : shows
        .filter((s) => s.day_of_week === (day + 1) % 7)
        .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))
        .slice(0, 3);
  return { current, upcoming: rest };
}

export const FLYER_AREAS = [
  { value: "tristate", label: "Tristate" },
  { value: "dmv", label: "DMV" },
  { value: "new_york", label: "New York" },
  { value: "florida", label: "Florida" },
  { value: "jamaica", label: "Jamaica" },
] as const;

export type FlyerArea = (typeof FLYER_AREAS)[number]["value"];

export type Flyer = {
  id: string;
  title: string | null;
  area: FlyerArea;
  storage_path: string;
  event_date: string | null;
  expires_at: string | null;
  created_at: string;
  is_approved?: boolean;
  url: string;
};

export function isFlyerExpired(flyer: { expires_at: string | null }) {
  return Boolean(flyer.expires_at && new Date(flyer.expires_at).getTime() <= Date.now());
}

export const flyersQuery = (
  area: FlyerArea | "all",
  limit: number,
  includeExpired = false,
  includePending = false,
) =>
  queryOptions({
    queryKey: ["event-flyers", area, limit, includeExpired, includePending],
    queryFn: async (): Promise<{ flyers: Flyer[]; hasMore: boolean }> => {
      let query = supabase
        .from("event_flyers")
        .select("id, title, area, storage_path, event_date, expires_at, created_at, is_approved")
        .order("created_at", { ascending: false })
        .limit(limit + 1);
      if (area !== "all") query = query.eq("area", area);
      if (!includePending) query = query.eq("is_approved", true);
      // Expired flyers disable themselves everywhere on the public site.

      if (!includeExpired) query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data ?? [];
      const hasMore = rows.length > limit;
      const page = rows.slice(0, limit);
      if (!page.length) return { flyers: [], hasMore: false };
      const { data: signed } = await supabase.storage
        .from("event-flyers")
        .createSignedUrls(page.map((row) => row.storage_path), 60 * 60 * 6);
      const urls = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
      return {
        flyers: page.map((row) => ({ ...row, url: urls.get(row.storage_path) ?? "" })),
        hasMore,
      };
    },
    staleTime: 60_000,
    refetchInterval: 300_000,
  });
