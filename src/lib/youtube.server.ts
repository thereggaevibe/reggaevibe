export type PlaylistVideo = {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  views: string;
};

function decode(raw: string) {
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return raw;
  }
}

/**
 * Scrapes a public YouTube playlist page for its most recent videos.
 * No API key required — titles and view counts come from the embedded payload.
 */
export async function fetchPlaylistVideos(playlistId: string, limit = 5): Promise<PlaylistVideo[]> {
  const res = await fetch(`https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}&hl=en`, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
      "accept-language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) return [];
  const html = await res.text();

  const videos: PlaylistVideo[] = [];
  const chunks = html.split('"lockupViewModel":').slice(1);

  for (const chunk of chunks) {
    const slice = chunk.slice(0, 20000);
    const id = slice.match(/\/vi\/([\w-]{6,20})\//)?.[1];
    if (!id || videos.some((video) => video.id === id)) continue;
    const title = slice.match(/"lockupMetadataViewModel":\{"title":\{"content":"(.*?)"\}/)?.[1];
    const views = slice.match(/"([\d.,KMB]+) views?"/)?.[1];
    videos.push({
      id,
      title: title ? decode(title) : "Reggae Vibe visual",
      views: views ? `${views} views` : "",
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${id}&list=${playlistId}`,
    });
    if (videos.length >= limit) break;
  }

  return videos;
}
