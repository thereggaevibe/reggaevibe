import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Flame } from "lucide-react";
import { formatArticleDate, publishedArticlesQuery } from "@/lib/articles-queries";
import { stationLogoAsset } from "@/lib/site-images";

/** "Wagwan" — five latest trending stories, image left of the title. */
export function TrendingSidebar() {
  const { data: trending } = useQuery(publishedArticlesQuery(24, { categorySlug: "trending" }));
  const { data: fallback } = useQuery(publishedArticlesQuery(5));
  const items = (trending?.length ? trending : (fallback ?? [])).slice(0, 5);

  return (
    <section className="panel overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Flame className="size-5 text-rasta-red" />
        <h2 className="text-2xl">Wagwan</h2>
        <span className="ml-auto text-[10px] font-extrabold uppercase tracking-widest text-gold">Trending</span>
      </div>

      {!items.length ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Trending stories are on the way.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((article) => (
            <li key={article.id} className="flex items-center gap-3 px-4 py-3">
              <Link
                to="/magazine/$slug"
                params={{ slug: article.slug }}
                className="shrink-0 no-underline"
                aria-label={article.title}
              >
                <img
                  src={article.featured_image_url ?? stationLogoAsset.url}
                  alt={`${article.title} thumbnail`}
                  width={64}
                  height={64}
                  loading="lazy"
                  className="size-16 rounded-md border border-border object-cover"
                />
              </Link>
              <div className="min-w-0">
                <Link
                  to="/magazine/$slug"
                  params={{ slug: article.slug }}
                  className="line-clamp-2 text-sm font-semibold hover:text-gold"
                >
                  {article.title}
                </Link>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {formatArticleDate(article.published_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border px-4 py-3">
        <Link to="/trending" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-gold">
          See more trending stories <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}
