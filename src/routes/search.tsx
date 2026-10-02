import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PlayCircle, Search } from "lucide-react";
import { formatArticleDate, primaryCategoryName, publishedArticlesQuery } from "@/lib/articles-queries";
import { videoCategoriesQuery } from "@/lib/video-categories-queries";
import { getPlaylistVisuals } from "@/lib/youtube.functions";
import { stationLogoAsset } from "@/lib/site-images";


const title = "Search — Reggae Vibe Radio";
const description = "Search Reggae Vibe Radio articles, interviews and reggae and dancehall news coverage.";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const value = search["q"];
    return typeof value === "string" && value ? { q: value } : {};
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
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const term = (q ?? "").trim().toLowerCase();
  const { data: articles, isLoading } = useQuery(publishedArticlesQuery(200));
  const { data: categories } = useQuery(videoCategoriesQuery(true));
  const fetchPlaylist = useServerFn(getPlaylistVisuals);

  const { data: videos } = useQuery({
    queryKey: ["search-videos", (categories ?? []).map((category) => category.playlist_id)],
    enabled: !!term && !!categories?.length,
    staleTime: 600_000,
    queryFn: async () => {
      const lists = await Promise.all(
        (categories ?? []).map((category) => fetchPlaylist({ data: { playlistId: category.playlist_id, limit: 40 } })),
      );
      const seen = new Set<string>();
      return lists.flat().filter((video) => (seen.has(video.id) ? false : (seen.add(video.id), true)));
    },
  });

  const videoResults = (videos ?? []).filter((video) => !!term && video.title.toLowerCase().includes(term)).slice(0, 24);

  const results = (articles ?? []).filter(
    (article) =>
      !!term &&
      (article.title.toLowerCase().includes(term) ||
        (article.excerpt ?? "").toLowerCase().includes(term) ||
        article.body.toLowerCase().includes(term) ||
        primaryCategoryName(article).toLowerCase().includes(term)),
  );


  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center gap-3">
        <Search className="size-7 text-gold" />
        <h1 className="text-3xl md:text-4xl">Search results</h1>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {term ? `Showing matches for “${q}”` : "Type a search term in the header to find stories."}
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Searching…</p>
      ) : !results.length ? (
        term && <p className="mt-8 text-sm text-muted-foreground">No stories matched that search.</p>
      ) : (
        <ul className="mt-8 divide-y divide-border">
          {results.map((article) => (
            <li key={article.id} className="flex gap-4 py-4">
              <Link to="/magazine/$slug" params={{ slug: article.slug }} className="shrink-0 no-underline" aria-label={article.title}>
                <img
                  src={article.featured_image_url ?? stationLogoAsset.url}
                  alt={`${article.title} thumbnail`}
                  width={96}
                  height={96}
                  loading="lazy"
                  className="size-20 rounded-md border border-border object-cover"
                />
              </Link>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-rasta-red">
                  {primaryCategoryName(article)}
                </p>
                <h2 className="mt-1 text-lg">
                  <Link to="/magazine/$slug" params={{ slug: article.slug }} className="hover:text-gold">
                    {article.title}
                  </Link>
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">{formatArticleDate(article.published_at)}</p>
                {article.excerpt && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{article.excerpt}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!!videoResults.length && (
        <section className="mt-12">
          <h2 className="text-2xl">Videos</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {videoResults.map((video) => (
              <a
                key={video.id}
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-xl border border-border bg-surface no-underline"
              >
                <span className="relative block">
                  <img src={video.thumbnail} alt={`${video.title} thumbnail`} loading="lazy" className="aspect-video w-full object-cover" />
                  <PlayCircle className="absolute inset-0 m-auto size-10 text-transparent transition-colors group-hover:text-rasta-red" />
                </span>
                <span className="block p-3">
                  <span className="line-clamp-2 block text-sm font-semibold">{video.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{video.views}</span>
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
