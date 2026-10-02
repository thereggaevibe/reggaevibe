import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { articleBySlugQuery, formatArticleDate, formatArticleTime } from "@/lib/articles-queries";
import { ShareLinks } from "@/components/site/ShareLinks";


export const Route = createFileRoute("/magazine/$slug")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(articleBySlugQuery(params.slug)),
  head: ({ params, loaderData }) => {
    const readable = params.slug.replace(/-/g, " ");
    const title = `${readable} — Reggae Vibe Radio Magazine`;
    const description = `Read "${readable}" on the Reggae Vibe Radio Magazine — reggae and dancehall news, interviews and reviews.`;
    const keywords = (loaderData?.keywords ?? []).join(", ");
    const pageUrl = `https://reggaeviberadio.com/magazine/${params.slug}`;
    const image = loaderData?.featured_image_url;
    const absoluteImage = image && /^https:\/\//.test(image) ? image : null;
    return {
      meta: [
        { title: loaderData?.title ? `${loaderData.title} — Reggae Vibe Radio Magazine` : title },
        { name: "description", content: loaderData?.excerpt || description },
        { property: "og:title", content: loaderData?.title ?? title },
        { property: "og:description", content: loaderData?.excerpt || description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: pageUrl },
        { name: "twitter:card", content: absoluteImage ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: loaderData?.title ?? title },
        { name: "twitter:description", content: loaderData?.excerpt || description },
        ...(absoluteImage
          ? [
              { property: "og:image", content: absoluteImage },
              { property: "og:image:alt", content: `${loaderData?.title ?? readable} featured image` },
              { name: "twitter:image", content: absoluteImage },
            ]
          : []),
        ...(keywords ? [{ name: "keywords", content: keywords }] : []),
      ],
      links: [{ rel: "canonical", href: `https://rasta-groove-central.lovable.app/magazine/${params.slug}` }],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const { data: article, isLoading } = useQuery(articleBySlugQuery(slug));

  if (isLoading) return <p className="p-16 text-center text-sm text-muted-foreground">Loading article…</p>;

  if (!article) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-3xl">Article not found</h1>
        <p className="mt-3 text-muted-foreground">This story may have been unpublished or moved.</p>
        <Link to="/magazine" className="mt-6 inline-flex items-center gap-2 text-gold">
          <ArrowLeft className="size-4" /> Back to the Magazine
        </Link>
      </div>
    );
  }

  const categories = (article.article_category_links ?? [])
    .map((link) => link.article_categories)
    .filter((category): category is { name: string; slug: string } => Boolean(category));

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <Link to="/magazine" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gold">
        <ArrowLeft className="size-4" /> Magazine
      </Link>
      <h1 className="mt-6 text-4xl md:text-6xl">{article.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {article.author_name && <span className="text-gold">By {article.author_name}</span>}
        <span>
          {formatArticleDate(article.published_at)}
          {article.published_at ? ` at ${formatArticleTime(article.published_at)}` : ""}
        </span>
        {categories.map((category) => (
          <Link key={category.slug} to="/category/$slug" params={{ slug: category.slug }} className="text-gold hover:text-foreground">
            {category.name}
          </Link>
        ))}
      </div>
      {article.excerpt && <p className="mt-4 text-lg text-muted-foreground">{article.excerpt}</p>}
      {article.featured_image_url && (
        <img
          src={article.featured_image_url}
          alt={`${article.title} featured image`}
          className="mt-8 aspect-[16/9] w-full rounded-xl border border-border object-cover"
        />
      )}
      <div className="mt-8 space-y-5 text-base leading-relaxed text-foreground/90">
        {article.body.split(/\n{2,}/).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      {(article.keywords ?? []).length > 0 && (
        <div className="mt-10 border-t border-border pt-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tags</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {(article.keywords ?? []).map((tag) => (
              <li key={tag}>
                <Link
                  to="/search"
                  search={{ q: tag }}
                  className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-semibold text-gold no-underline transition-colors hover:border-gold hover:bg-gold/10"
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-10 border-t border-border pt-6">
        <ShareLinks title={article.title} image={article.featured_image_url ?? undefined} description={article.excerpt ?? undefined} />
      </div>

    </article>
  );
}
