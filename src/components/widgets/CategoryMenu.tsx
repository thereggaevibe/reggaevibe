import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { articleCategoriesQuery } from "@/lib/articles-queries";
import { isCustomIcon, resolveCategoryIcon } from "@/lib/category-icons";

/** Sticky vertical menu of the article categories flagged for the menu. */
export function CategoryMenu({ activeSlug, compact = false }: { activeSlug?: string | undefined; compact?: boolean }) {
  const { data: categories } = useQuery(articleCategoriesQuery());
  const items = (categories ?? []).filter((category) => category.show_in_menu);

  if (compact) return (
    <nav aria-label="Magazine categories" className="overflow-x-auto border-y border-border py-3 lg:hidden">
      <ul className="flex w-max gap-2">
        {items.map((category) => (
          <li key={category.id}>
            <Link to="/category/$slug" params={{ slug: category.slug }} aria-current={activeSlug === category.slug ? "page" : undefined}
              className={"inline-flex min-h-10 items-center border-b-2 px-2 text-xs font-bold uppercase no-underline " + (activeSlug === category.slug ? "border-gold text-gold" : "border-transparent text-muted-foreground hover:text-gold")}>{category.name}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <nav aria-label="Magazine categories" className="panel overflow-hidden rounded-lg">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-xl">Categories</h2>
      </div>
      {!items.length ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">No categories are pinned to the menu yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((category) => {
            const Icon = resolveCategoryIcon(category.icon);
            const active = activeSlug === category.slug;
            return (
              <li key={category.id}>
                <Link
                  to="/category/$slug"
                  params={{ slug: category.slug }}
                  aria-current={active ? "page" : undefined}
                  className={
                    "flex items-center gap-3 px-4 py-3 text-sm font-semibold uppercase tracking-wide no-underline transition-colors hover:bg-secondary/60 " +
                    (active ? "bg-secondary text-gold" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {isCustomIcon(category.icon) ? (
                    <img src={category.icon} alt="" width={20} height={20} className="size-5 rounded object-cover" />
                  ) : (
                    <Icon className="size-5 text-gold" />
                  )}
                  {category.name}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
