import { Pause, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { HeartVoteButton } from "@/components/ui/HeartVoteButton";
import { useRadio } from "@/components/player/radio-provider";
import { stationLogoAsset } from "@/lib/site-images";

const stationLogo = stationLogoAsset.url;

function Visualizer({ active }: { active: boolean }) {
  const bars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  return (
    <div className="flex h-8 items-end gap-[3px]" aria-hidden="true">
      {bars.map((i) => (
        <span
          key={i}
          className={
            "w-[3px] origin-bottom rounded-full " +
            (i % 3 === 0 ? "bg-rasta-green" : i % 3 === 1 ? "bg-gold" : "bg-rasta-red")
          }
          style={{
            height: `${10 + ((i * 7) % 22)}px`,
            animation: active ? `eq ${0.7 + (i % 5) * 0.12}s ease-in-out ${i * 0.05}s infinite` : "none",
            transform: active ? undefined : "scaleY(0.35)",
          }}
        />
      ))}
    </div>
  );
}

export function StickyPlayer() {
  const { playing, toggle, volume, setVolume, nowPlaying, voteForTrack, votedTrackIds } = useRadio();
  const title = nowPlaying?.title ?? "Reggae Vibe Radio";
  const artist = nowPlaying?.artist || "Live from the studio";
  const artwork = nowPlaying?.artwork ?? stationLogo;
  const trackId = nowPlaying?.trackId ?? null;
  const voted = trackId ? votedTrackIds.includes(trackId) : false;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-3 md:bottom-auto md:left-auto md:right-4 md:top-20 md:w-[26rem] md:px-0 md:pb-0">
      <div className="pointer-events-auto overflow-hidden rounded-xl border border-border bg-surface/95 shadow-lift backdrop-blur">
        <div className="rasta-stripe h-1 w-full" />
        <div className="flex items-center gap-3 p-3">
          <img
            src={artwork}
            alt={`${title} artwork`}
            width={56}
            height={56}
            loading="lazy"
            className="size-14 shrink-0 rounded-md border border-border bg-background object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = stationLogo;
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-rasta-red">
                <span className="size-1.5 rounded-full bg-rasta-red" style={{ animation: "pulse-live 1.6s ease-in-out infinite" }} />
                On air
              </span>
              <Visualizer active={playing} />
            </div>
            <div className="mt-1 overflow-hidden">
              <div
                className="flex w-max gap-8 whitespace-nowrap text-sm font-semibold"
                style={{ animation: title.length > 26 ? "marquee 16s linear infinite" : "none" }}
              >
                <span>
                  {title} <span className="text-muted-foreground">— {artist}</span>
                </span>
                {title.length > 26 && (
                  <span aria-hidden="true">
                    {title} <span className="text-muted-foreground">— {artist}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <HeartVoteButton
              voted={voted}
              disabled={!trackId}
              label={voted ? "Already voted" : "Vote for this track"}
              onVote={() => {
                if (trackId) void voteForTrack(trackId);
              }}
            />
            <Button size="icon" onClick={toggle} aria-label={playing ? "Pause stream" : "Play stream"}>
              {playing ? <Pause /> : <Play />}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border px-3 py-2">
          <Volume2 className="size-4 text-muted-foreground" />
          <Slider
            value={[Math.round(volume * 100)]}
            max={100}
            step={1}
            aria-label="Volume"
            onValueChange={(v) => setVolume((v[0] ?? 80) / 100)}
          />
        </div>
      </div>
    </div>
  );
}
