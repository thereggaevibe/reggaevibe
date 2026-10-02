import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchArticlePage, formatArticleDate, formatArticleTime, primaryCategoryName } from "@/lib/articles-queries";
import { stationLogoAsset } from "@/lib/site-images";

const PAGE_SIZE = 10;

/** Infinite feed of the newest articles across every category. */
export function ArticleFeed({ categorySlug }: { categorySlug?: string | undefined }) {
  const sentinel = useRef<HTMLDivElement | null>(null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["article-feed"],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchArticlePage(pageParam as number, PAGE_SIZE),
    getNextPageParam: (last, pages) => (last.length < PAGE_SIZE ? undefined : pages.length),
  });

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    }, { rootMargin: "300px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const all = (data?.pages ?? []).flat();
  const articles = categorySlug
    ? all.filter((article) =>
        (article.article_category_links ?? []).some((link) => link.article_categories?.slug === categorySlug),
      )
    : all;

  return (
    <section>
      <h2 className="text-2xl md:text-3xl">Latest from every category</h2>
      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading articles…</p>
      ) : !articles.length ? (
        <p className="mt-4 text-sm text-muted-foreground">No articles published yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {articles.map((article) => (
            <li key={article.id} className="flex gap-4 py-4">
              <Link
                to="/magazine/$slug"
                params={{ slug: article.slug }}
                className="shrink-0 no-underline"
                aria-label={article.title}
              >
                <img
                  src={article.featured_image_url ?? stationLogoAsset.url}
                  alt={`${article.title} thumbnail`}
                  width={112}
                  height={112}
                  loading="lazy"
                  className="size-20 rounded-md border border-border object-cover md:size-28"
                />
              </Link>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-rasta-red">
                  {primaryCategoryName(article)}
                </p>
                <h3 className="mt-1 text-lg md:text-xl">
                  <Link to="/magazine/$slug" params={{ slug: article.slug }} className="hover:text-gold">
                    {article.title}
                  </Link>
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {article.author_name && <span className="font-semibold text-gold">By {article.author_name} · </span>}
                  {formatArticleDate(article.published_at)}
                  {article.published_at ? ` at ${formatArticleTime(article.published_at)}` : ""}
                </p>
                {article.excerpt && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{article.excerpt}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div ref={sentinel} className="h-8" />
      {isFetchingNextPage && <p className="text-xs text-muted-foreground">Loading more…</p>}
      {!hasNextPage && articles.length > 0 && (
        <p className="py-2 text-center text-xs uppercase tracking-widest text-muted-foreground">You reached the last story</p>
      )}
    </section>
  );
}
