import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({ videoIds: z.array(z.string().min(1).max(64)).min(1).max(60) });

export type VideoRatingSummaryRow = { video_id: string; average: number; votes: number };

/**
 * Public, anonymised rating aggregates. Individual video_ratings rows are private
 * to their author, so the aggregate is computed server-side.
 */
export const getVideoRatingSummary = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<VideoRatingSummaryRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("video_rating_summary", {
      _video_ids: data.videoIds,
    });
    if (error) throw error;
    return (rows ?? []).map((row) => ({
      video_id: row.video_id,
      average: Number(row.average ?? 0),
      votes: Number(row.votes ?? 0),
    }));
  });
