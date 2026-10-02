import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { PlayCircle, Youtube } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getReggaeVisuals, REGGAE_VISUALS_PLAYLIST } from "@/lib/youtube.functions";
import { VideoRating } from "@/components/video/VideoRating";


type Visual = { id: string; title: string; url: string; thumbnail: string; views: string };

/** Five newest Reggae Music Visuals pulled from the station YouTube playlist. */
export function VisualsRail() {
  const fetchVisuals = useServerFn(getReggaeVisuals);
  const [active, setActive] = useState<Visual | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["reggae-visuals"],
    queryFn: () => fetchVisuals(),
    staleTime: 600_000,
  });

  return (
    <section className="panel overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Youtube className="size-5 text-rasta-red" />
        <h2 className="text-2xl">Reggae Music Visuals</h2>
      </div>

      {isLoading ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Loading the latest visuals…</p>
      ) : !data?.length ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Visuals are loading slow right now —{" "}
          <a href={`https://www.youtube.com/playlist?list=${REGGAE_VISUALS_PLAYLIST}`} target="_blank" rel="noreferrer">
            watch the playlist on YouTube
          </a>
          .
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((video) => (
            <li key={video.id}>
              <button
                type="button"
                onClick={() => setActive(video as Visual)}
                aria-label={`Play ${video.title} in a larger view`}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60"
              >
                <span className="relative shrink-0">
                  <img
                    src={video.thumbnail}
                    alt={`${video.title} thumbnail`}
                    width={96}
                    height={64}
                    loading="lazy"
                    className="h-16 w-24 rounded-md border border-border object-cover"
                  />
                  <PlayCircle className="absolute inset-0 m-auto size-6 text-gold drop-shadow" />
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 block text-sm font-semibold">{video.title}</span>
                  {video.views && <span className="mt-0.5 block text-xs text-muted-foreground">{video.views}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border px-4 py-3">
        <Link to="/visuals" className="text-sm font-bold uppercase tracking-widest text-gold no-underline hover:underline">
          More Reggae Music Visuals
        </Link>
      </div>


      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-4xl border-border bg-background p-3">
          <DialogTitle className="text-lg">{active?.title}</DialogTitle>
          {active && (
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
              <iframe
                src={`https://www.youtube.com/embed/${active.id}?autoplay=1&rel=0`}
                title={active.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="size-full"
              />
            </div>
          )}
          {active && <VideoRating videoId={active.id} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
