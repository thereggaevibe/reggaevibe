import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showsQuery } from "@/lib/station-queries";
import { sourcedShows, uniqueShows, type ShowItem } from "@/lib/shows-data";
import { ShowScheduleButton } from "@/components/site/ShowScheduleButton";
import { stationLogoAsset } from "@/lib/site-images";

export function ShowsPreview() {
  const { data } = useQuery(showsQuery());
  const shows: ShowItem[] = data?.length ? (data as unknown as ShowItem[]) : sourcedShows;
  const featured = uniqueShows(shows).slice(0, 6);

  return (
    <section className="panel rounded-xl p-5 md:p-8">
      <p className="text-xs font-extrabold uppercase tracking-widest text-rasta-red">Straight from the studio</p>
      <h2 className="mt-1 text-4xl md:text-6xl">Reggae Vibe Radio Shows</h2>

      <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {featured.map((show) => (
          <article key={show.id} className="group relative rounded-xl border border-border bg-background/50">
            <img
              src={show.image_url ?? stationLogoAsset.url}
              alt={`${show.title} show artwork`}
              width={640}
              height={400}
              loading="lazy"
              className="aspect-[16/10] w-full rounded-t-xl object-cover"
            />
            <div className="p-4">
              <h3 className="truncate text-2xl">{show.title}</h3>
              <p className="mt-1 truncate text-sm text-muted-foreground">{show.djs?.name ?? "Reggae Vibe Selectors"}</p>
              <ShowScheduleButton
                slots={show.slots}
                label={show.slots.length > 1 ? `Schedule · ${show.slots.length} airtimes` : "Schedule"}
                className="mt-3"
              />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-7 flex justify-center">
        <Button asChild size="lg">
          <Link to="/shows">
            See all shows <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}
