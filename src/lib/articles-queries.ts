import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ArticleCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  icon: string;
  show_in_menu: boolean;
};

export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  featured_image_url: string | null;
  status: string;
  published_at: string | null;
  is_headline: boolean;
  author_name: string | null;
  keywords: string[] | null;
  created_at: string;
  updated_at: string;
  article_category_links?: { category_id: string; article_categories: { name: string; slug: string } | null }[];
};

const SELECT = "id, title, slug, excerpt, body, featured_image_url, status, published_at, is_headline, author_name, keywords, created_at, updated_at, article_category_links(category_id, article_categories(name, slug))";

export const articleCategoriesQuery = () =>
  queryOptions({
    queryKey: ["article-categories"],
    queryFn: async (): Promise<ArticleCategory[]> => {
      const { data, error } = await supabase
        .from("article_categories")
        .select("id, name, slug, sort_order, icon, show_in_menu")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300_000,
  });

export const articleCategoryBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["article-category", slug],
    queryFn: async (): Promise<ArticleCategory | null> => {
      const { data, error } = await supabase
        .from("article_categories")
        .select("id, name, slug, sort_order, icon, show_in_menu")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 300_000,
  });

/** Filter at the database before pagination, so every page contains only this category's published stories. */
export async function fetchCategoryArticlePage(categoryId: string, page: number, pageSize = 12): Promise<Article[]> {
  const from = page * pageSize;
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt, body, featured_image_url, status, published_at, is_headline, author_name, keywords, created_at, updated_at, article_category_links!inner(category_id, article_categories(name, slug))")
    .eq("article_category_links.category_id", categoryId)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return (data ?? []) as unknown as Article[];
}

/** First category name attached to an article, used as the small kicker label. */
export function primaryCategoryName(article: Article) {
  return (article.article_category_links ?? [])[0]?.article_categories?.name ?? "Magazine";
}

/** One page of published articles, newest first — powers the infinite feed. */
export async function fetchArticlePage(page: number, pageSize = 10): Promise<Article[]> {
  const from = page * pageSize;
  const { data, error } = await supabase
    .from("articles")
    .select(SELECT)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return (data ?? []) as unknown as Article[];
}


/** Published articles only — drafts and future scheduled posts stay hidden. */
export const publishedArticlesQuery = (limit = 12, options?: { headlinesOnly?: boolean; categorySlug?: string }) =>
  queryOptions({
    queryKey: ["articles", limit, options?.headlinesOnly ?? false, options?.categorySlug ?? "all"],
    queryFn: async (): Promise<Article[]> => {
      let query = supabase
        .from("articles")
        .select(SELECT)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(limit);
      if (options?.headlinesOnly) query = query.eq("is_headline", true);
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as unknown as Article[];
      if (!options?.categorySlug) return rows;
      return rows.filter((row) =>
        (row.article_category_links ?? []).some((link) => link.article_categories?.slug === options.categorySlug),
      );
    },
    staleTime: 60_000,
  });

export const articleBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["article", slug],
    queryFn: async (): Promise<Article | null> => {
      const { data, error } = await supabase.from("articles").select(SELECT).eq("slug", slug).maybeSingle();
      if (error) throw error;
      return (data as unknown as Article | null) ?? null;
    },
    staleTime: 60_000,
  });

/** Splits a comma-separated keyword string into a clean, de-duplicated list. */
export function parseKeywords(value: string): string[] {
  const seen = new Set<string>();
  for (const part of value.split(",")) {
    const tag = part.trim().replace(/\s+/g, " ");
    if (tag) seen.add(tag);
  }
  return [...seen];
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function formatArticleDate(value: string | null) {
  if (!value) return "Unscheduled";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function formatArticleTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * Uploads an image to a private bucket and returns a long-lived signed URL that
 * can be stored on the row and rendered directly in an <img> tag.
 */
export async function uploadImage(bucket: "article-images" | "track-artwork", file: File, prefix = "") {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${prefix}${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
  if (up.error) throw up.error;
  const signed = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("Could not sign the image URL");
  return signed.data.signedUrl;
}
