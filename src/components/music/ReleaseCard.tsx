import { useRef, useState } from "react";
import { Pause, Play, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money, type ReleaseWithUrls } from "@/lib/music-queries";

type Props = {
  release: ReleaseWithUrls;
  onBuy: (release: ReleaseWithUrls) => void;
};

export function ReleaseCard({ release, onBuy }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const togglePreview = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play();
      setPlaying(true);
    }
  };

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {release.coverUrl ? (
          <img
            src={release.coverUrl}
            alt={`${release.title} cover art by ${release.artist_name}`}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center text-xs text-muted-foreground">No artwork</div>
        )}
        {release.previewUrl && (
          <button
            type="button"
            onClick={togglePreview}
            aria-label={playing ? `Pause preview of ${release.title}` : `Play preview of ${release.title}`}
            className="absolute bottom-3 left-3 grid size-11 place-items-center rounded-full bg-background/85 text-gold backdrop-blur transition hover:bg-background"
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
        )}
        <Badge className="absolute right-3 top-3 uppercase">{release.release_type}</Badge>
      </div>

      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 font-display text-lg leading-tight">{release.title}</h3>
        <p className="line-clamp-1 text-sm text-muted-foreground">{release.artist_name}</p>
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{release.genre}</span>
          <Button size="sm" onClick={() => onBuy(release)}>
            <ShoppingCart className="mr-1.5 size-4" />
            {money(release.price_cents)}
          </Button>
        </div>
      </div>

      {release.previewUrl && (
        <audio ref={audioRef} src={release.previewUrl} onEnded={() => setPlaying(false)} preload="none" className="hidden" />
      )}
    </article>
  );
}
