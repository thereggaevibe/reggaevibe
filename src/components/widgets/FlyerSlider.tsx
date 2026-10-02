import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { flyersQuery, type FlyerArea, type Flyer } from "@/lib/station-queries";

const COUNT = 12;

/** Single-row, full-width, auto-scrolling flyer strip. Pauses on hover. */
export function FlyerSlider({
  area = "all",
  label,
  eyebrow = "Event flyers",
}: {
  area?: FlyerArea | "all";
  label: string;
  eyebrow?: string;
}) {
  const [selected, setSelected] = useState<Flyer | null>(null);
  const { data, isLoading } = useQuery(flyersQuery(area, COUNT));
  const flyers = data?.flyers ?? [];

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-end justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-xl">{label}</h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-gold">{eyebrow}</span>
      </div>

      {isLoading ? (
        <p className="p-5 text-sm text-muted-foreground">Loading flyers…</p>
      ) : !flyers.length ? (
        <p className="p-5 text-sm text-muted-foreground">No flyers posted for {label} yet.</p>
      ) : (
        <div className="group relative w-full overflow-hidden py-4">
          <div
            className="flex w-max animate-[flyer-scroll_45s_linear_infinite] gap-3 px-4 group-hover:[animation-play-state:paused]"
          >
            {/* Duplicate the row for a seamless infinite loop */}
            {[...flyers, ...flyers].map((flyer, i) => (
              <button
                key={`${flyer.id}-${i}`}
                type="button"
                onClick={() => setSelected(flyer)}
                aria-label={`Open ${flyer.title ?? label} flyer in lightbox`}
                className="group/item relative w-44 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2 text-left focus:outline-none focus:ring-2 focus:ring-gold sm:w-52"
              >
                <img
                  src={flyer.url}
                  alt={flyer.title ? `${flyer.title} flyer` : `${label} event flyer`}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover/item:scale-105"
                />
                <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover/item:opacity-100">
                  <ZoomIn className="size-3.5" />
                </span>
                {(flyer.title || flyer.event_date) && (
                  <span className="block px-2 py-2">
                    {flyer.title && <span className="block truncate text-xs font-semibold">{flyer.title}</span>}
                    {flyer.event_date && (
                      <time dateTime={flyer.event_date} className="text-[10px] text-muted-foreground">
                        {new Date(flyer.event_date).toLocaleDateString()}
                      </time>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>
          <style>{`
            @keyframes flyer-scroll {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
          `}</style>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">{selected?.title ? `${selected.title} flyer` : "Event flyer"}</DialogTitle>
          {selected && (
            <img
              src={selected.url}
              alt={selected.title ? `${selected.title} flyer` : `${label} event flyer`}
              className="max-h-[85vh] w-full rounded-xl object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
