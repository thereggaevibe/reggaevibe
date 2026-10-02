import { createServerFn } from "@tanstack/react-start";
import { lookupTrackArtwork } from "@/lib/itunes.server";

const STATION_ID = "qtv562rrs1duv";
const NOW_PLAYING_URL = `https://www.radiojar.com/api/stations/${STATION_ID}/now_playing/`;

export type NowPlaying = {
  trackId: string | null;
  title: string;
  artist: string;
  artwork: string | null;
  category: "reggae" | "dancehall" | "other";
  show: string | null;
};

const FALLBACK: NowPlaying = {
  trackId: null,
  title: "Reggae Vibe Radio",
  artist: "Live stream",
  artwork: null,
  category: "other",
  show: null,
};

function normKey(title: string, artist: string) {
  return `${title}|${artist}`.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Reads the live Radiojar metadata, keeps the track catalogue in sync and logs
 * a play row so Recently Played / history reports stay accurate.
 */
export const getNowPlaying = createServerFn({ method: "GET" }).handler(async (): Promise<NowPlaying> => {
  let raw: Record<string, unknown>;
  try {
    const res = await fetch(NOW_PLAYING_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return FALLBACK;
    raw = (await res.json()) as Record<string, unknown>;
  } catch {
    return FALLBACK;
  }

  const title = String(raw["title"] ?? "").trim();
  const artist = String(raw["artist"] ?? "").trim();
  const artwork = typeof raw["thumb"] === "string" && raw["thumb"] ? String(raw["thumb"]) : null;
  const album = String(raw["album"] ?? "").trim();
  const showRaw = raw["show"] as { name?: string } | undefined;
  const show = showRaw?.name ? String(showRaw.name) : null;

  if (!title) return { ...FALLBACK, artwork, show };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const key = normKey(title, artist);

  const { data: existing } = await supabaseAdmin
    .from("tracks")
    .select("id, category, category_locked, last_played_at, play_count, artwork_url, release_year")
    .eq("norm_key", key)
    .maybeSingle();

  // Auto-categorise from the stream tags via the genre map.
  const haystack = `${album} ${show ?? ""} ${title} ${artist}`.toLowerCase();
  let category: NowPlaying["category"] = "other";
  const { data: map } = await supabaseAdmin.from("genre_map").select("tag, category");
  for (const row of map ?? []) {
    if (haystack.includes(row.tag.toLowerCase())) {
      category = row.category;
      break;
    }
  }

  // Enrich with high-resolution Apple Music / iTunes artwork + release year.
  const needsEnrichment = !existing || !existing.artwork_url || existing.release_year === null;
  const itunes = needsEnrichment
    ? await lookupTrackArtwork(artist, title, album)
    : { artwork: null, releaseYear: null };
  const bestArtwork = itunes.artwork ?? artwork;

  let trackId = existing?.id ?? null;
  const nowIso = new Date().toISOString();

  if (!existing) {
    const { data: inserted } = await supabaseAdmin
      .from("tracks")
      .insert({
        norm_key: key,
        title,
        artist,
        artwork_url: bestArtwork,
        release_year: itunes.releaseYear,
        category,
        raw_tags: [album, show].filter(Boolean).join(", ") || null,
        play_count: 1,
        last_played_at: nowIso,
      })
      .select("id, category")
      .maybeSingle();
    trackId = inserted?.id ?? null;
    if (inserted) await supabaseAdmin.from("plays").insert({ track_id: inserted.id });
    return { trackId, title, artist, artwork: bestArtwork, category, show };
  }

  const lastPlayed = existing.last_played_at ? new Date(existing.last_played_at).getTime() : 0;
  const isNewSpin = Date.now() - lastPlayed > 6 * 60 * 1000;

  if (isNewSpin) {
    await supabaseAdmin
      .from("tracks")
      .update({
        last_played_at: nowIso,
        play_count: (existing.play_count ?? 0) + 1,
        ...(bestArtwork ? { artwork_url: bestArtwork } : {}),
        ...(itunes.releaseYear ? { release_year: itunes.releaseYear } : {}),
        ...(existing.category_locked ? {} : { category }),
      })
      .eq("id", existing.id);
    await supabaseAdmin.from("plays").insert({ track_id: existing.id });
  }

  if (!isNewSpin && needsEnrichment && (itunes.artwork || itunes.releaseYear)) {
    await supabaseAdmin
      .from("tracks")
      .update({
        ...(itunes.artwork ? { artwork_url: itunes.artwork } : {}),
        ...(itunes.releaseYear ? { release_year: itunes.releaseYear } : {}),
      })
      .eq("id", existing.id);
  }

  return {
    trackId,
    title,
    artist,
    artwork: bestArtwork,
    category: existing.category_locked ? existing.category : category,
    show,
  };
});
