import { useEffect, useRef } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CategoryMenu } from "@/components/widgets/CategoryMenu";
import { Button } from "@/components/ui/button";
import { articleCategoryBySlugQuery, fetchCategoryArticlePage, formatArticleDate, formatArticleTime } from "@/lib/articles-queries";
import { stationLogoAsset } from "@/lib/site-images";

const PAGE_SIZE = 12;
const SLUG = "trending";
const title = "Trending — Reggae Vibe Radio Magazine";
const description = "The latest Trending stories, features and updates from Reggae Vibe Radio Magazine.";
const url = "https://reggaeviberadio.com/trending";

export const Route = createFileRoute("/trending")({
  loader: async ({ context }) => {
    const category = await context.queryClient.ensureQueryData(articleCategoryBySlugQuery(SLUG));
    if (!category) throw notFound();
    const articles = await fetchCategoryArticlePage(category.id, 0, PAGE_SIZE);
    return { category, articles };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.category.name ?? "Trending";
    const pageTitle = `${name} — Reggae Vibe Radio Magazine`;
    const pageDescription = `The latest ${name} stories, features and updates from Reggae Vibe Radio Magazine.`;
    return {
      meta: [
        { title: pageTitle || title },
        { name: "description", content: pageDescription || description },
        { property: "og:title", content: pageTitle },
        { property: "og:description", content: pageDescription },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: TrendingPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-4xl">Nothing trending yet</h1>
      <p className="mt-4 text-muted-foreground">Check back soon for the hottest reggae and dancehall stories.</p>
      <Link to="/magazine" className="mt-6 inline-flex items-center gap-2 text-gold"><ArrowLeft className="size-4" /> Back to Magazine</Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div role="alert" className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-4xl">Stories unavailable</h1>
      <p className="mt-4 text-muted-foreground">{error instanceof Error ? error.message : "Please try again later."}</p>
      <Link to="/magazine" className="mt-6 inline-flex items-center gap-2 text-gold"><ArrowLeft className="size-4" /> Back to Magazine</Link>
    </div>
  ),
});

function TrendingPage() {
  const { category, articles: initialArticles } = Route.useLoaderData();
  const sentinel = useRef<HTMLDivElement | null>(null);
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, error } = useInfiniteQuery({
    queryKey: ["category-articles", category.id],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchCategoryArticlePage(category.id, pageParam, PAGE_SIZE),
    getNextPageParam: (last, pages) => last.length < PAGE_SIZE ? undefined : pages.length,
    initialData: { pages: [initialArticles], pageParams: [0] },
    staleTime: 60_000,
  });

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage || error) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
    }, { rootMargin: "250px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, error]);

  const stories = data?.pages.flat() ?? initialArticles;
  const lead = stories[0];
  const secondary = stories.slice(1);
  const topStories = stories.slice(1, 6);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:pt-12">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
        <Link to="/magazine" className="hover:text-gold">Magazine</Link><span>/</span><span className="text-gold">{category.name}</span>
      </nav>
      <header className="mt-7 border-b border-border pb-6 md:pb-8">
        <div className="mb-4 h-1 w-20 rasta-stripe" />
        <h1 className="text-5xl md:text-7xl">{category.name}</h1>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">The latest stories in {category.name}.</p>
      </header>

      <div className="mt-4 lg:hidden"><CategoryMenu compact activeSlug={category.slug} /></div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:gap-12">
        <main className="min-w-0">
          {lead ? (
            <article className="border-b border-border pb-8">
              <Link to="/magazine/$slug" params={{ slug: lead.slug }} className="block overflow-hidden rounded-md no-underline">
                <img src={lead.featured_image_url ?? stationLogoAsset.url} alt={`${lead.title} featured image`} className="aspect-[16/9] w-full object-cover transition-transform duration-300 hover:scale-[1.02]" />
              </Link>
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold uppercase text-muted-foreground">
                <span className="text-rasta-red">{category.name}</span>
                <span>{formatArticleDate(lead.published_at)}{lead.published_at ? ` · ${formatArticleTime(lead.published_at)}` : ""}</span>
              </div>
              <h2 className="mt-3 text-3xl leading-tight md:text-5xl"><Link to="/magazine/$slug" params={{ slug: lead.slug }} className="hover:text-gold">{lead.title}</Link></h2>
              {lead.excerpt && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">{lead.excerpt}</p>}
              {lead.author_name && <p className="mt-3 text-xs font-semibold text-gold">By {lead.author_name}</p>}
            </article>
          ) : <p className="py-12 text-muted-foreground">No published stories in {category.name} yet.</p>}

          {secondary.length > 0 && (
            <section className="pt-8" aria-label={`More ${category.name} stories`}>
              <div className="mb-5 flex items-center gap-3 border-b border-border pb-3"><h2 className="text-2xl md:text-3xl">More in {category.name}</h2><span className="h-1 flex-1 rasta-stripe" /></div>
              <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2">
                {secondary.map((article) => (
                  <article key={article.id} className="min-w-0 border-b border-border pb-5">
                    <Link to="/magazine/$slug" params={{ slug: article.slug }} className="block overflow-hidden rounded-md no-underline">
                      <img src={article.featured_image_url ?? stationLogoAsset.url} alt={`${article.title} thumbnail`} loading="lazy" className="aspect-[16/10] w-full object-cover transition-transform duration-300 hover:scale-[1.03]" />
                    </Link>
                    <p className="mt-3 text-[11px] font-bold uppercase text-rasta-red">{category.name} <span className="mx-1 text-muted-foreground">·</span> <span className="text-muted-foreground">{formatArticleDate(article.published_at)}</span></p>
                    <h3 className="mt-2 text-xl leading-tight md:text-2xl"><Link to="/magazine/$slug" params={{ slug: article.slug }} className="hover:text-gold">{article.title}</Link></h3>
                    {article.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{article.excerpt}</p>}
                    {article.author_name && <p className="mt-2 text-xs text-gold">By {article.author_name}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}
          <div ref={sentinel} className="h-4" />
          {isFetchingNextPage && <p className="py-4 text-sm text-muted-foreground">Loading more stories…</p>}
          {error && <div role="alert" className="py-4 text-sm text-rasta-red">Could not load more stories. <Button variant="link" onClick={() => void fetchNextPage()}>Try again</Button></div>}
          {!hasNextPage && secondary.length > 0 && <p className="py-6 text-center text-xs uppercase text-muted-foreground">You’re all caught up</p>}
        </main>

        <aside className="grid gap-8 lg:sticky lg:top-24">
          <section className="border-t-4 border-rasta-red pt-4" aria-label={`Top ${category.name} stories`}>
            <div className="flex items-center justify-between"><h2 className="text-2xl">Top Stories</h2><span className="text-xs font-bold uppercase text-gold">{category.name}</span></div>
            {topStories.length ? (
              <ol className="mt-4 divide-y divide-border">
                {topStories.map((article, index) => (
                  <li key={article.id} className="flex gap-3 py-4 first:pt-0">
                    <span className="text-2xl font-bold text-gold">{String(index + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1"><Link to="/magazine/$slug" params={{ slug: article.slug }} className="block text-sm font-bold leading-snug hover:text-gold">{article.title}</Link><p className="mt-1 text-xs text-muted-foreground">{formatArticleDate(article.published_at)}</p></div>
                    <Link to="/magazine/$slug" params={{ slug: article.slug }} className="shrink-0 no-underline" aria-label={`Read ${article.title}`}><img src={article.featured_image_url ?? stationLogoAsset.url} alt="" loading="lazy" className="size-14 rounded object-cover" /></Link>
                  </li>
                ))}
              </ol>
            ) : <p className="mt-4 text-sm text-muted-foreground">More stories are on the way.</p>}
          </section>
          <CategoryMenu activeSlug={category.slug} />
          <Link to="/magazine" className="inline-flex items-center gap-2 text-sm font-bold uppercase text-gold">All Magazine Stories <ArrowRight className="size-4" /></Link>
        </aside>
      </div>
    </div>
  );
}
