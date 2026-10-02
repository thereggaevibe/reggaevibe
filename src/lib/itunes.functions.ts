import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Backfills missing album artwork / release years on existing tracks using the
 * public iTunes Search API. Admin only.
 */
export const backfillTrackArtwork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin");
    if (!roles?.length) throw new Error("Forbidden");

    const { lookupTrackArtwork } = await import("@/lib/itunes.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: tracks } = await supabaseAdmin
      .from("tracks")
      .select("id, title, artist, artwork_url, release_year")
      .or("artwork_url.is.null,release_year.is.null")
      .limit(40);

    let updated = 0;
    for (const track of tracks ?? []) {
      const match = await lookupTrackArtwork(track.artist ?? "", track.title);
      const patch: { artwork_url?: string; release_year?: number } = {};
      if (!track.artwork_url && match.artwork) patch.artwork_url = match.artwork;
      if (track.release_year === null && match.releaseYear) patch.release_year = match.releaseYear;
      if (!Object.keys(patch).length) continue;
      const { error } = await supabaseAdmin.from("tracks").update(patch).eq("id", track.id);
      if (!error) updated += 1;
    }

    return { scanned: tracks?.length ?? 0, updated };
  });
