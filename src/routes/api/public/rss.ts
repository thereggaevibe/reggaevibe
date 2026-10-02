import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/rss")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const origin = new URL(request.url).origin;
        const supabase = createClient(
          process.env["VITE_SUPABASE_URL"]!,
          process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!,
          { auth: { persistSession: false } },
        );

        const { data } = await supabase
          .from("articles")
          .select("title, slug, excerpt, published_at")
          .eq("status", "published")
          .lte("published_at", new Date().toISOString())
          .order("published_at", { ascending: false })
          .limit(50);

        const escape = (value: string) =>
          value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

        const items = (data ?? [])
          .map(
            (article) => `    <item>
      <title>${escape(article.title)}</title>
      <link>${origin}/magazine/${article.slug}</link>
      <guid isPermaLink="true">${origin}/magazine/${article.slug}</guid>
      <pubDate>${new Date(article.published_at ?? Date.now()).toUTCString()}</pubDate>
      <description>${escape(article.excerpt ?? "")}</description>
    </item>`,
          )
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Reggae Vibe Radio Magazine</title>
    <link>${origin}/magazine</link>
    <description>Reggae and dancehall news, interviews and reviews from Reggae Vibe Radio.</description>
    <language>en</language>
    <atom:link href="${origin}/api/public/rss" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

        return new Response(xml, {
          headers: {
            "content-type": "application/rss+xml; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        });
      },
    },
  },
} as never);
