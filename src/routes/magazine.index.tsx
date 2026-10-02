import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Rss } from "lucide-react";
import { NewsSlider } from "@/components/widgets/NewsSlider";
import { TrendingSidebar } from "@/components/widgets/TrendingSidebar";
import { VisualsRail } from "@/components/widgets/VisualsRail";
import { AdvertiseCard } from "@/components/widgets/AdvertiseCard";
import { CategoryMenu } from "@/components/widgets/CategoryMenu";
import { AdZoneRenderer } from "@/components/ads/AdZoneRenderer";
import { ArticleFeed } from "@/components/widgets/ArticleFeed";
import { WeatherVibe } from "@/components/widgets/WeatherVibe";
import { formatArticleDate, publishedArticlesQuery } from "@/lib/articles-queries";
import { stationLogoAsset } from "@/lib/site-images";

const title = "Magazine — Reggae Vibe Radio";
const description =
  "Long-form reggae and dancehall features, artist interviews, trending stories and reggae music visuals from Reggae Vibe Radio.";

export const Route = createFileRoute("/magazine/")({
  validateSearch: (search: Record<string, unknown>): { category?: string } => {
    const value = search["category"];
    return typeof value === "string" && value ? { category: value } : {};
  },
  beforeLoad: ({ search }) => {
    if (search.category) throw redirect({ to: "/category/$slug", params: { slug: search.category }, replace: true });
  },
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MagazinePage,
});

function MagazinePage() {
  const { data: headlines } = useQuery(publishedArticlesQuery(100, { categorySlug: "headlines" }));
  const { data: recent } = useQuery(publishedArticlesQuery(12));
  const sliderArticles = [...(headlines ?? []), ...(recent ?? []).filter((article) => !(headlines ?? []).some((headline) => headline.id === article.id))].slice(0, 15);
  const latest = (recent ?? []).slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex flex-wrap items-center gap-3">
        <BookOpen className="size-8 text-gold" />
        <h1 className="text-4xl md:text-5xl">Magazine</h1>
        <div className="ml-auto">
          <WeatherVibe />
        </div>
      </div>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Features, interviews and reviews from the culture — straight from the Reggae Vibe Radio newsroom.
      </p>

      <div className="mt-6 lg:hidden"><CategoryMenu compact /></div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)_300px]">
        <div className="grid content-start gap-6 lg:self-stretch">
          <TrendingSidebar />
          <div className="grid gap-6 lg:sticky lg:top-20">
            <div className="hidden lg:block">
              <CategoryMenu />
            </div>
            <AdZoneRenderer pageTarget="magazine" positionKey="left_under_categories" />
          </div>
        </div>


        <div className="grid gap-10">
          <NewsSlider articles={sliderArticles} />

          {latest.length > 0 && (
            <section>
              <div className="grid gap-6 sm:grid-cols-3">
                {latest.map((article) => (
                  <article key={article.id}>
                    <Link to="/magazine/$slug" params={{ slug: article.slug }} className="block overflow-hidden rounded-xl border border-border no-underline">
                      <img
                        src={article.featured_image_url ?? stationLogoAsset.url}
                        alt={`${article.title} featured image`}
                        className="aspect-[4/3] w-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    </Link>
                    <p className="mt-3 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                      {formatArticleDate(article.published_at)}
                    </p>
                    <h3 className="mt-1 text-[0.75rem] leading-tight">
                      <Link to="/magazine/$slug" params={{ slug: article.slug }} className="hover:text-gold">
                        {article.title}
                      </Link>
                    </h3>
                  </article>
                ))}
              </div>
            </section>
          )}


          <ArticleFeed />
        </div>

        <div className="grid gap-6 lg:sticky lg:top-24">
          <VisualsRail />
          <AdZoneRenderer pageTarget="magazine" positionKey="right_under_visuals" />
        </div>
      </div>



      <div className="mt-14 flex justify-center border-t border-border pt-8">
        <a
          href="/api/public/rss"
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gold"
        >
          <Rss className="size-4" /> Subscribe to our RSS feed
        </a>
      </div>
    </div>
  );
}
