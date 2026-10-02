import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { Article } from "@/lib/articles-queries";
import { formatArticleDate } from "@/lib/articles-queries";
import { stationLogoAsset } from "@/lib/site-images";

export function NewsSlider({ articles }: { articles: Article[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = useMemo(() => articles.slice(0, 15), [articles]);

  const move = useCallback(
    (delta: number) => {
      setIndex((currentIndex) => {
        if (slides.length < 2) return 0;
        return (currentIndex + delta + slides.length) % slides.length;
      });
    },
    [slides.length],
  );

  useEffect(() => {
    setIndex((currentIndex) => (slides.length > 0 ? Math.min(currentIndex, slides.length - 1) : 0));
  }, [slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = window.setTimeout(() => move(1), 5000);
    return () => window.clearTimeout(timer);
  }, [index, move, paused, slides.length]);

  if (!slides.length) {
    return (
      <div className="panel flex aspect-[16/9] items-center justify-center p-8 text-center text-muted-foreground">
        Headline stories will appear here as soon as they are published.
      </div>
    );
  }

  const current = slides[index] ?? slides[0];
  if (!current) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-background">
      <div className="relative aspect-[16/9] w-full">
        <img
          key={current.id}
          src={current.featured_image_url ?? stationLogoAsset.url}
          alt={`${current.title} featured image`}
          className="size-full animate-in fade-in object-cover duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <button
        type="button"
        onClick={() => setPaused((v) => !v)}
        aria-label={paused ? "Resume the news slider" : "Pause the news slider"}
        className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
      </button>

      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 p-5 md:p-8">
        <div className="min-w-0 max-w-[25%]">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-rasta-red">
            Headline news · {formatArticleDate(current.published_at)}
          </p>
          <h3 className="mt-1 text-base leading-tight md:text-lg">
            <Link
              to="/magazine/$slug"
              params={{ slug: current.slug }}
              className="line-clamp-3 block max-w-[23ch] hover:text-gold"
            >
              {current.title}
            </Link>
          </h3>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Previous article"
            className="grid size-10 place-items-center rounded-full bg-background/80 backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={slides.length < 2}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Next article"
            className="grid size-10 place-items-center rounded-full bg-background/80 backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={slides.length < 2}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
