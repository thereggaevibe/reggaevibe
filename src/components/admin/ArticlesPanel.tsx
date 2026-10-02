import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { sendPushNotification } from "@/lib/push.functions";
import { Trash2, Pencil, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORY_ICONS, CATEGORY_ICON_NAMES, isCustomIcon, resolveCategoryIcon } from "@/lib/category-icons";
import {
  articleCategoriesQuery,
  formatArticleDate,
  slugify,
  uploadImage,
  type Article,
  parseKeywords,
} from "@/lib/articles-queries";


type PublishMode = "now" | "schedule" | "unpublished";

const EMPTY = {
  id: "",
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  featured_image_url: "",
  is_headline: false,
  author_name: "",
  keywords: "",
  publishMode: "now" as PublishMode,
  scheduledAt: "",
  categoryIds: [] as string[],
  sendPush: true,
};

function toLocalInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ArticlesPanel() {
  const qc = useQueryClient();
  const sendPush = useServerFn(sendPushNotification);
  const { user } = useAuth();
  const { data: categories } = useQuery(articleCategoriesQuery());
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: articles } = useQuery({
    queryKey: ["admin-articles"],
    queryFn: async (): Promise<Article[]> => {
      const { data, error } = await supabase
        .from("articles")
        .select(
          "id, title, slug, excerpt, body, featured_image_url, status, published_at, is_headline, author_name, keywords, created_at, updated_at, article_category_links(category_id, article_categories(name, slug))",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Article[];
    },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-articles"] });
    qc.invalidateQueries({ queryKey: ["articles"] });
    qc.invalidateQueries({ queryKey: ["article"] });
  }

  async function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    const { error } = await supabase.from("article_categories").insert({ name, slug: slugify(name) });
    if (error) {
      toast.error(error.message || "Could not add the category");
      return;
    }
    setNewCategory("");
    qc.invalidateQueries({ queryKey: ["article-categories"] });
    toast.success("Category added");
  }

  async function updateCategory(id: string, patch: { icon?: string; show_in_menu?: boolean; sort_order?: number }) {
    const { error } = await supabase.from("article_categories").update(patch).eq("id", id);
    if (error) {
      toast.error("Could not update the category");
      return;
    }
    qc.invalidateQueries({ queryKey: ["article-categories"] });
  }

  /** Moves a category up or down in the menu order by rewriting sort_order for the whole list. */
  async function moveCategory(index: number, direction: -1 | 1) {
    const list = [...(categories ?? [])];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const a = list[index]!;
    const b = list[target]!;
    list[index] = b;
    list[target] = a;
    const updates = await Promise.all(
      list.map((category, i) => supabase.from("article_categories").update({ sort_order: i }).eq("id", category.id)),
    );
    if (updates.some((r) => r.error)) {
      toast.error("Could not reorder the categories");
      return;
    }
    qc.invalidateQueries({ queryKey: ["article-categories"] });
  }


  async function removeCategory(id: string) {

    const { error } = await supabase.from("article_categories").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete the category");
      return;
    }
    qc.invalidateQueries({ queryKey: ["article-categories"] });
    refresh();
  }

  function edit(article: Article) {
    setForm({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt ?? "",
      body: article.body ?? "",
      featured_image_url: article.featured_image_url ?? "",
      is_headline: article.is_headline,
      author_name: article.author_name ?? "",
      keywords: (article.keywords ?? []).join(", "),
      publishMode:
        article.status !== "published"
          ? "unpublished"
          : article.published_at && new Date(article.published_at).getTime() > Date.now()
            ? "schedule"
            : "now",
      scheduledAt: toLocalInput(article.published_at),
      categoryIds: (article.article_category_links ?? []).map((link) => link.category_id),
      sendPush: false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadImage("article-images", file);
      setForm((prev) => ({ ...prev, featured_image_url: url }));
      toast.success("Featured image uploaded");
    } catch {
      toast.error("Could not upload the image");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const slug = form.slug.trim() || slugify(form.title);
    const published_at =
      form.publishMode === "now"
        ? new Date().toISOString()
        : form.publishMode === "schedule"
          ? form.scheduledAt
            ? new Date(form.scheduledAt).toISOString()
            : null
          : null;

    if (form.publishMode === "schedule" && !published_at) {
      setBusy(false);
      toast.error("Pick a publish date and time");
      return;
    }

    const payload = {
      title: form.title,
      slug,
      excerpt: form.excerpt || null,
      body: form.body,
      featured_image_url: form.featured_image_url || null,
      is_headline: form.is_headline,
      author_name: form.author_name.trim() || null,
      keywords: parseKeywords(form.keywords),
      status: form.publishMode === "unpublished" ? "draft" : "published",
      published_at,
      author_id: user?.id ?? null,
    };

    let articleId = form.id;
    if (articleId) {
      const { error } = await supabase.from("articles").update(payload).eq("id", articleId);
      if (error) {
        setBusy(false);
        toast.error(error.message || "Could not save the article");
        return;
      }
    } else {
      const { data, error } = await supabase.from("articles").insert(payload).select("id").single();
      if (error || !data) {
        setBusy(false);
        toast.error(error?.message || "Could not save the article");
        return;
      }
      articleId = data.id;
    }

    await supabase.from("article_category_links").delete().eq("article_id", articleId);
    if (form.categoryIds.length) {
      await supabase
        .from("article_category_links")
        .insert(form.categoryIds.map((category_id) => ({ article_id: articleId, category_id })));
    }

    const livePublish =
      form.publishMode === "now" ||
      (form.publishMode === "schedule" && published_at !== null && new Date(published_at).getTime() <= Date.now());

    if (form.sendPush && livePublish) {
      try {
        const result = await sendPush({
          data: {
            title: form.title,
            message: form.excerpt?.trim() || "Fresh from the Reggae Vibe Radio newsroom — tap to read.",
            url: `https://reggaeviberadio.com/magazine/${slug}`,
            ...(form.featured_image_url?.startsWith("https://") ? { imageUrl: form.featured_image_url } : {}),
          },
        });
        if (result.ok) toast.success(`Push notification sent to ${result.recipients} subscribers`);
        else toast.error(result.error);
      } catch {
        toast.error("The article saved, but the push notification failed to send");
      }
    }

    setBusy(false);
    toast.success(form.id ? "Article updated" : "Article created");
    setForm({ ...EMPTY });
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete the article");
      return;
    }
    refresh();
  }

  async function togglePublish(article: Article) {
    const publish = article.status !== "published";
    const { error } = await supabase
      .from("articles")
      .update({
        status: publish ? "published" : "draft",
        published_at: publish ? (article.published_at ?? new Date().toISOString()) : null,
      })
      .eq("id", article.id);
    if (error) {
      toast.error("Could not change the article status");
      return;
    }
    refresh();
  }

  function statusLabel(article: Article) {
    if (article.status !== "published") return "Unpublished";
    if (article.published_at && new Date(article.published_at).getTime() > Date.now()) {
      return `Scheduled ${new Date(article.published_at).toLocaleString()}`;
    }
    return `Published ${formatArticleDate(article.published_at)}`;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={save} className="panel grid gap-4 p-5">
        <h2 className="text-lg">{form.id ? "Edit article" : "New article"}</h2>

        <div className="grid gap-2">
          <Label htmlFor="a-title">Title</Label>
          <Input
            id="a-title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="a-slug">URL slug</Label>
          <Input id="a-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="a-author">Author name</Label>
          <Input
            id="a-author"
            placeholder="e.g. Reggae Vibe Staff"
            value={form.author_name}
            onChange={(e) => setForm({ ...form, author_name: e.target.value })}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="a-keywords">Keywords / SEO tags</Label>
          <Input
            id="a-keywords"
            placeholder="reggae, dancehall, #PhillyReggaeVibeEvents, #JAReggaeVibeEvents"
            value={form.keywords}
            onChange={(e) => setForm({ ...form, keywords: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Separate tags with commas. They power the article meta keywords and tag badges.</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="a-excerpt">Excerpt</Label>
          <Textarea id="a-excerpt" rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="a-body">Article body</Label>
          <Textarea id="a-body" rows={10} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="a-image">Featured image</Label>
          <Input id="a-image" type="file" accept="image/*" onChange={(e) => void handleFile(e.target.files?.[0] ?? null)} />
          <Input
            placeholder="…or paste an image URL"
            value={form.featured_image_url}
            onChange={(e) => setForm({ ...form, featured_image_url: e.target.value })}
          />
          {form.featured_image_url && (
            <img src={form.featured_image_url} alt="Featured preview" className="h-32 w-full rounded-md border border-border object-cover" />
          )}
        </div>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold">Categories</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(categories ?? []).map((category) => (
              <label key={category.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.categoryIds.includes(category.id)}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      categoryIds: checked
                        ? [...prev.categoryIds, category.id]
                        : prev.categoryIds.filter((id) => id !== category.id),
                    }))
                  }
                />
                {category.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold">Publishing</legend>
          <div role="radiogroup" className="flex flex-wrap gap-1 rounded-md border border-border p-1">
            {([
              { value: "now", label: "Publish now" },
              { value: "schedule", label: "Schedule" },
              { value: "unpublished", label: "Unpublished" },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={form.publishMode === option.value}
                onClick={() => setForm({ ...form, publishMode: option.value })}
                className={
                  "rounded px-3 py-1 text-xs font-semibold " +
                  (form.publishMode === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
                }
              >
                {option.label}
              </button>
            ))}
          </div>
          {form.publishMode === "schedule" && (
            <Input
              type="datetime-local"
              aria-label="Publish date and time"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            />
          )}
        </fieldset>

        <label className="flex items-center gap-3 text-sm">
          <Switch checked={form.is_headline} onCheckedChange={(checked) => setForm({ ...form, is_headline: checked })} />
          Feature in the Magazine headline slider
        </label>

        <div className="grid gap-1">
          <label className="flex items-center gap-3 text-sm">
            <Switch
              checked={form.sendPush}
              onCheckedChange={(checked) => setForm({ ...form, sendPush: checked })}
              aria-label="Send Push Notification"
            />
            Send Push Notification
          </label>
          <p className="text-xs text-muted-foreground">
            Alerts everyone subscribed to notifications when this article goes live.
          </p>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : form.id ? "Save article" : "Create article"}</Button>
          {form.id && (
            <Button type="button" variant="secondary" onClick={() => setForm({ ...EMPTY })}>Cancel</Button>
          )}
        </div>
      </form>

      <div className="grid gap-6">
        <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen} className="panel overflow-hidden">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between px-5 py-4 text-left"
              aria-label="Toggle article categories"
            >
              <h2 className="text-lg">Article categories{(categories ?? []).length ? ` (${(categories ?? []).length})` : ""}</h2>
              <ChevronDown className={"size-4 transition-transform " + (categoriesOpen ? "rotate-180" : "")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-border">
            <div className="flex gap-2 border-b border-border px-5 py-3">
              <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name" aria-label="New category name" />
              <Button type="button" variant="secondary" onClick={() => void addCategory()}><Plus /> Add</Button>
            </div>
            <ul className="max-h-[24rem] divide-y divide-border overflow-y-auto">
              {(categories ?? []).map((category, index) => {
                const Icon = resolveCategoryIcon(category.icon);
                const open = expanded === category.id;
                return (
                  <li key={category.id} className="grid gap-2 px-5 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="grid">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6"
                          disabled={index === 0}
                          aria-label={`Move ${category.name} up`}
                          onClick={() => void moveCategory(index, -1)}
                        >
                          <ChevronUp className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6"
                          disabled={index === (categories ?? []).length - 1}
                          aria-label={`Move ${category.name} down`}
                          onClick={() => void moveCategory(index, 1)}
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                      </div>
                      {isCustomIcon(category.icon) ? (

                        <img src={category.icon} alt="" className="size-5 rounded object-cover" />
                      ) : (
                        <Icon className="size-5 text-gold" />
                      )}
                      <span className="flex-1 truncate font-semibold">{category.name}</span>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch
                          checked={category.show_in_menu}
                          aria-label={`Show ${category.name} in the magazine menu`}
                          onCheckedChange={(checked) => void updateCategory(category.id, { show_in_menu: checked })}
                        />
                        In menu
                      </label>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit the icon for ${category.name}`}
                        aria-expanded={open}
                        onClick={() => setExpanded(open ? null : category.id)}
                      >
                        <ChevronDown className={"transition-transform " + (open ? "rotate-180" : "")} />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label={`Delete ${category.name}`} onClick={() => void removeCategory(category.id)}>
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                    {open && (
                      <>
                        <div className="flex flex-wrap gap-1">
                          {CATEGORY_ICON_NAMES.map((name) => {
                            const Option = CATEGORY_ICONS[name]!;
                            return (
                              <button
                                key={name}
                                type="button"
                                aria-label={`Use the ${name} icon for ${category.name}`}
                                aria-pressed={category.icon === name}
                                onClick={() => void updateCategory(category.id, { icon: name })}
                                className={
                                  "grid size-8 place-items-center rounded border " +
                                  (category.icon === name ? "border-gold bg-secondary text-gold" : "border-border text-muted-foreground hover:text-foreground")
                                }
                              >
                                <Option className="size-4" />
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            defaultValue={isCustomIcon(category.icon) ? category.icon : ""}
                            placeholder="…or paste your own icon image URL"
                            aria-label={`Custom icon URL for ${category.name}`}
                            className="h-8 text-xs"
                            onBlur={(e) => {
                              const value = e.currentTarget.value.trim();
                              if (!value || value === category.icon) return;
                              void updateCategory(category.id, { icon: value });
                            }}
                          />
                          <Input
                            type="file"
                            accept="image/*"
                            aria-label={`Upload a custom icon for ${category.name}`}
                            className="h-8 w-40 text-xs"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const url = await uploadImage("article-images", file, "icons/");
                                await updateCategory(category.id, { icon: url });
                              } catch {
                                toast.error("Could not upload the icon");
                              }
                            }}
                          />
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
              {!(categories ?? []).length && <li className="px-5 py-3 text-sm text-muted-foreground">No categories yet.</li>}
            </ul>
          </CollapsibleContent>
        </Collapsible>


        <section className="panel overflow-hidden">
          <div className="border-b border-border px-5 py-4"><h2 className="text-lg">Articles</h2></div>
          <ul className="max-h-[36rem] divide-y divide-border overflow-y-auto">
            {(articles ?? []).map((article) => (
              <li key={article.id} className="flex items-center gap-3 px-4 py-3">
                {article.featured_image_url && (
                  <img src={article.featured_image_url} alt="" className="size-12 rounded-md border border-border object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{article.title}{article.is_headline ? " · headline" : ""}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {article.author_name ? `${article.author_name} · ` : ""}{statusLabel(article)}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => void togglePublish(article)}>
                  {article.status === "published" ? "Unpublish" : "Publish"}
                </Button>
                <Button size="icon" variant="ghost" aria-label={`Edit ${article.title}`} onClick={() => edit(article)}>
                  <Pencil />
                </Button>
                <Button size="icon" variant="ghost" aria-label={`Delete ${article.title}`} onClick={() => void remove(article.id)}>
                  <Trash2 className="text-destructive" />
                </Button>
              </li>
            ))}
            {!(articles ?? []).length && <li className="px-5 py-4 text-sm text-muted-foreground">No articles yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
