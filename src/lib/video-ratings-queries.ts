import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getVideoRatingSummary } from "@/lib/video-ratings.functions";

export type RatingSummary = { average: number; votes: number };
export type RatingSummaryMap = Record<string, RatingSummary>;

/** Average rating + vote count for a batch of video IDs, keyed by video ID. */
export const videoRatingSummaryQuery = (videoIds: string[]) =>
  queryOptions({
    queryKey: ["video-rating-summary", [...videoIds].sort().join(",")],
    enabled: videoIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<RatingSummaryMap> => {
      const rows = await getVideoRatingSummary({ data: { videoIds } });
      const map: RatingSummaryMap = {};
      for (const row of rows) {
        map[row.video_id] = { average: row.average, votes: row.votes };
      }
      return map;
    },
  });

/** Ratings for a single video plus the signed-in user's own star value. */
export const videoRatingQuery = (videoId: string, userId: string | null) =>
  queryOptions({
    queryKey: ["video-rating", videoId, userId],
    enabled: !!videoId,
    staleTime: 30_000,
    queryFn: async (): Promise<RatingSummary & { mine: number | null }> => {
      const rows = await getVideoRatingSummary({ data: { videoIds: [videoId] } });
      const summary = rows[0];
      let mine: number | null = null;
      if (userId) {
        // Individual ratings are private: RLS only returns the caller's own row.
        const { data, error } = await supabase
          .from("video_ratings")
          .select("rating")
          .eq("video_id", videoId)
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        mine = data?.rating ?? null;
      }
      return { average: summary?.average ?? 0, votes: summary?.votes ?? 0, mine };
    },
  });


/** Insert or replace the current user's rating for a video. */
export async function submitVideoRating(videoId: string, userId: string, rating: number) {
  const { error } = await supabase
    .from("video_ratings")
    .upsert({ video_id: videoId, user_id: userId, rating }, { onConflict: "video_id,user_id" });
  if (error) throw error;
}
