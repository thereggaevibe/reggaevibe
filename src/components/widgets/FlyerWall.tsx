import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { flyersQuery, type FlyerArea, type Flyer } from "@/lib/station-queries";

const PAGE = 10; // 5 columns x 2 rows

export function FlyerWall({
  area,
  label,
  page = PAGE,
  eyebrow = "Event flyers",
}: {
  area: FlyerArea | "all";
  label: string;
  page?: number;
  eyebrow?: string;
}) {
  const [limit, setLimit] = useState(page);
  const [selected, setSelected] = useState<Flyer | null>(null);
  const { data, isLoading, isFetching } = useQuery(flyersQuery(area, limit));
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
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {flyers.map((flyer) => (
              <figure
                key={flyer.id}
                className="group relative overflow-hidden rounded-xl border border-border bg-surface-2 animate-in fade-in duration-500"
              >
                <button
                  type="button"
                  onClick={() => setSelected(flyer)}
                  className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-background"
                  aria-label={`Open ${flyer.title ?? label} flyer in lightbox`}
                >
                  <img
                    src={flyer.url}
                    alt={flyer.title ? `${flyer.title} flyer` : `${label} event flyer`}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <ZoomIn className="size-3.5" />
                  </span>
                </button>
                {(flyer.title || flyer.event_date) && (
                  <figcaption className="px-2 py-2">
                    {flyer.title && <p className="truncate text-xs font-semibold">{flyer.title}</p>}
                    {flyer.event_date && (
                      <time dateTime={flyer.event_date} className="text-[10px] text-muted-foreground">
                        {new Date(flyer.event_date).toLocaleDateString()}
                      </time>
                    )}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>

          {data?.hasMore && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" disabled={isFetching} onClick={() => setLimit((value) => value + page)}>
                {isFetching ? "Loading…" : `Load more flyers`}
              </Button>
            </div>
          )}
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
