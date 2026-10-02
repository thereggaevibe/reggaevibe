import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useRadio } from "@/components/player/radio-provider";

const BARS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MAX_BAR = 30;

function RastaSpectrum({ active, volume }: { active: boolean; volume: number }) {
  const [levels, setLevels] = useState<number[]>(() => BARS.map(() => 0.2));
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  const beat = useRef(0);

  useEffect(() => {
    if (!active || volume === 0) {
      setLevels(BARS.map(() => 0.14));
      return;
    }
    let alive = true;
    const tick = (now: number) => {
      if (!alive) return;
      // irregular refresh so the bars never look like a synced loop
      if (now - last.current > 70 + Math.random() * 90) {
        last.current = now;
        // random "beat" kicks make the whole spectrum jump every so often
        beat.current = Math.random() < 0.22 ? 1 : Math.max(0, beat.current - 0.35);
        setLevels((prev) =>
          prev.map((value) => {
            const target = Math.random() ** 1.7 * (0.55 + beat.current * 0.45) + Math.random() * 0.18;
            const smoothing = target > value ? 0.75 : 0.35;
            return Math.min(1, Math.max(0.08, value + (target - value) * smoothing));
          }),
        );
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [active, volume]);

  return (
    <div className="hidden h-8 items-end gap-[3px] sm:flex" aria-hidden="true">
      {BARS.map((i) => {
        const level = (levels[i] ?? 0.14) * Math.max(0.12, volume);
        return (
          <span
            key={i}
            className={
              "w-[3px] origin-bottom rounded-full transition-[height,opacity] duration-100 ease-out " +
              (i % 3 === 0 ? "bg-rasta-green" : i % 3 === 1 ? "bg-gold" : "bg-rasta-red")
            }
            style={{
              height: `${Math.max(3, level * MAX_BAR)}px`,
              opacity: 0.45 + level * 0.55,
            }}
          />
        );
      })}
    </div>
  );
}

export function CompactHeaderPlayer() {
  const [volumeOpen, setVolumeOpen] = useState(false);
  const { playing, toggle, volume, setVolume, nowPlaying } = useRadio();

  return (
    <div className="header-player flex min-w-0 items-center gap-2">

      <Button size="icon" onClick={toggle} aria-label={playing ? "Pause stream" : "Play stream"}>
        {playing ? <Pause /> : <Play />}
      </Button>
      <div className="min-w-0 max-w-44 leading-tight xl:max-w-56">
        <p className="truncate text-sm font-extrabold">{nowPlaying?.title ?? "Reggae Vibe Radio"}</p>
        <p className="truncate text-[11px] text-muted-foreground">{nowPlaying?.artist || "Live from the studio"}</p>
      </div>
      <div className="relative">
        <Button
          size="icon"
          variant="ghost"
          aria-label={volumeOpen ? "Close volume control" : "Adjust volume"}
          aria-expanded={volumeOpen}
          onClick={() => setVolumeOpen((value) => !value)}
        >
          {volume === 0 ? <VolumeX /> : <Volume2 />}
        </Button>
        {volumeOpen && (
          <div className="absolute left-0 top-12 z-50 w-40 rounded-md border border-border bg-surface p-4 shadow-lift animate-scale-in">
            <Slider
              value={[Math.round(volume * 100)]}
              max={100}
              step={1}
              aria-label="Stream volume"
              onValueChange={(value) => setVolume((value[0] ?? 80) / 100)}
            />
          </div>
        )}
      </div>
      <RastaSpectrum active={playing} volume={volume} />

    </div>
  );
}