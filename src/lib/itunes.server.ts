/**
 * Server-only helpers for the public iTunes Search API (no key required).
 * Used to enrich stream metadata with high-resolution album art and the
 * release year of a track.
 */

export type ItunesMatch = {
  artwork: string | null;
  releaseYear: number | null;
};

type ItunesResult = {
  artworkUrl100?: string;
  releaseDate?: string;
  collectionName?: string;
  trackName?: string;
  artistName?: string;
};

/** Upscales the 100x100 thumbnail URL Apple returns to a crisp 600x600 image. */
export function upscaleArtwork(url: string, size = 600) {
  return url.replace(/\/\d+x\d+(bb)?\.(jpg|png)/i, `/${size}x${size}bb.$2`);
}

function parseYear(releaseDate?: string) {
  if (!releaseDate) return null;
  const match = /^(\d{4})/.exec(releaseDate);
  return match ? Number(match[1]) : null;
}

async function search(term: string, entity: "song" | "album"): Promise<ItunesResult[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=${entity}&limit=5`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: ItunesResult[] };
    return json.results ?? [];
  } catch {
    return [];
  }
}

/**
 * Looks up artwork + release year for a track. Tries the song entity first
 * (gives an accurate release date), then falls back to the album entity.
 */
export async function lookupTrackArtwork(artist: string, title: string, album?: string): Promise<ItunesMatch> {
  const term = [artist, title].filter(Boolean).join(" ").trim();
  if (!term) return { artwork: null, releaseYear: null };

  const songs = await search(term, "song");
  const song = songs[0];
  if (song?.artworkUrl100) {
    return { artwork: upscaleArtwork(song.artworkUrl100), releaseYear: parseYear(song.releaseDate) };
  }

  const albumTerm = [artist, album || title].filter(Boolean).join(" ").trim();
  const albums = await search(albumTerm, "album");
  const found = albums[0];
  if (found?.artworkUrl100) {
    return { artwork: upscaleArtwork(found.artworkUrl100), releaseYear: parseYear(found.releaseDate) };
  }

  return { artwork: null, releaseYear: parseYear(song?.releaseDate) };
}
