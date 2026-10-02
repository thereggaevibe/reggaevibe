import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const REGGAE_VISUALS_PLAYLIST = "PLPqoST7imvR_ocU2tY4N_Fday17tALmto";

/** Latest videos from the Reggae Vibe "Reggae Music Visuals" YouTube playlist. */
export const getReggaeVisuals = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchPlaylistVideos } = await import("@/lib/youtube.server");
  try {
    return await fetchPlaylistVideos(REGGAE_VISUALS_PLAYLIST, 5);
  } catch {
    return [];
  }
});

/** Larger slice of the playlist for the full visuals gallery page. */
export const getReggaeVisualsGallery = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchPlaylistVideos } = await import("@/lib/youtube.server");
  try {
    return await fetchPlaylistVideos(REGGAE_VISUALS_PLAYLIST, 30);
  } catch {
    return [];
  }
});

/** Videos for any playlist configured as a video category in the Control Room. */
export const getPlaylistVisuals = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ playlistId: z.string(), limit: z.number().optional() }).parse(data))
  .handler(async ({ data }) => {
    const { fetchPlaylistVideos } = await import("@/lib/youtube.server");
    try {
      return await fetchPlaylistVideos(data.playlistId, data.limit ?? 40);
    } catch {
      return [];
    }
  });
