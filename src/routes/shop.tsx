import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Info, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductDetailsDialog } from "@/components/shop/ProductDetailsDialog";
import { formatMoney } from "@/components/shop/cart-provider";
import { getShopProduct, listShopProducts } from "@/lib/printful.functions";
import { shopCategoriesQuery, shopProductLinksQuery } from "@/lib/shop-categories-queries";

const productsQuery = queryOptions({
  queryKey: ["shop", "products"],
  queryFn: () => listShopProducts(),
  staleTime: 5 * 60 * 1000,
});

const productQuery = (productId: number) =>
  queryOptions({
    queryKey: ["shop", "product", productId],
    queryFn: () => getShopProduct({ data: { productId } }),
    staleTime: 5 * 60 * 1000,
  });

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — Reggae Vibe Radio Merch" },
      {
        name: "description",
        content:
          "Official Reggae Vibe Radio merch: tees, hoodies and caps printed on demand. Pick your size and colour and check out in seconds.",
      },
      { property: "og:title", content: "Shop — Reggae Vibe Radio Merch" },
      {
        property: "og:description",
        content: "Official Reggae Vibe Radio merch, printed on demand and shipped worldwide.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(productsQuery);
  },
  component: ShopPage,
  errorComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">The shop could not load right now. Please try again shortly.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Nothing here.</p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">Reggae Vibe Radio</p>
        <h1 className="text-display text-4xl uppercase tracking-wide sm:text-5xl">Merch Shop</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Rep the Unification Station. Every item is printed on demand and shipped straight to your door.
        </p>
      </header>
      {children}
    </div>
  );
}

function ShopPage() {
  const { data } = useSuspenseQuery(productsQuery);

  if (data.error) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">{data.error}</p>
      </Shell>
    );
  }

  if (!data.products.length) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">No products are published yet — check back soon.</p>
      </Shell>
    );
  }

  return <ShopGrid products={data.products} />;
}

const PER_PAGE = 24;

function ShopGrid({ products }: { products: Array<{ id: number; name: string; thumbnail: string | null; fromPrice: number | null; currency: string }> }) {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string | null>(null);
  const { data: categories = [] } = useQuery(shopCategoriesQuery());
  const { data: links = [] } = useQuery(shopProductLinksQuery());

  const activeIds = category
    ? new Set(links.filter((l) => l.category_id === category).map((l) => l.printful_product_id))
    : null;
  const filtered = activeIds ? products.filter((p) => activeIds.has(p.id)) : products;
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const select = (value: string | null) => {
    setCategory(value);
    setPage(1);
  };

  return (
    <Shell>
      {categories.length > 0 && (
        <nav className="mb-6 flex flex-wrap gap-2" aria-label="Product categories">
          <Button variant={category === null ? "default" : "secondary"} size="sm" onClick={() => select(null)}>
            All products
          </Button>
          {categories.map((item) => (
            <Button
              key={item.id}
              variant={category === item.id ? "default" : "secondary"}
              size="sm"
              onClick={() => select(item.id)}
            >
              {item.name}
            </Button>
          ))}
        </nav>
      )}

      {!visible.length && (
        <p className="text-sm text-muted-foreground">No products in this category yet.</p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((product) => (
          <ProductCard
            key={product.id}
            productId={product.id}
            name={product.name}
            thumbnail={product.thumbnail}
            fromPrice={product.fromPrice}
            currency={product.currency}
          />
        ))}
      </div>


      {pages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Shop pagination">
          <Button variant="secondary" size="sm" disabled={current === 1} onClick={() => setPage(current - 1)}>
            Previous
          </Button>
          <span className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Page {current} of {pages}
          </span>
          <Button variant="secondary" size="sm" disabled={current === pages} onClick={() => setPage(current + 1)}>
            Next
          </Button>
        </nav>
      )}
    </Shell>
  );
}

type ProductCardProps = {
  productId: number;
  name: string;
  thumbnail: string | null;
  fromPrice: number | null;
  currency: string;
};

function ProductCard({ productId, name, thumbnail, fromPrice, currency }: ProductCardProps) {
  const [details, setDetails] = useState(false);
  const { data, isLoading } = useQuery({ ...productQuery(productId), enabled: details });

  const variants = data?.product?.variants ?? [];
  const activeVariant = variants[0];

  const image = activeVariant?.image ?? thumbnail;
  const price = activeVariant?.retailPrice ?? fromPrice;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setDetails(true)}
        className="aspect-square w-full overflow-hidden bg-secondary"
        aria-label={`View details for ${name}`}
      >
        {image ? (
          <img
            src={image}
            alt={name}
            className="size-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="size-full" />
        )}
      </button>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h2 className="line-clamp-2 text-sm font-bold leading-snug">{name}</h2>
          <p className="mt-1 text-lg font-bold text-gold">
            {price ? formatMoney(price, activeVariant?.currency ?? currency) : isLoading ? "…" : "—"}
          </p>
        </div>

        {variants.length === 1 && activeVariant && (
          <Badge variant="secondary" className="w-fit uppercase">
            {[activeVariant.color, activeVariant.size].filter(Boolean).join(" / ") || "One size"}
          </Badge>
        )}

        <div className="mt-auto grid gap-2">
          <Button variant="secondary" onClick={() => setDetails(true)}>
            <Info /> Details
          </Button>
          <Button onClick={() => setDetails(true)}>
            <ShoppingBag /> Choose options
          </Button>
        </div>
      </div>

      <ProductDetailsDialog
        open={details}
        onOpenChange={setDetails}
        productId={productId}
        name={name}
        thumbnail={thumbnail}
        description={data?.product?.description ?? null}
        gallery={data?.product?.gallery ?? []}
        variants={variants}
        currency={currency}
        isLoading={isLoading}
      />
    </article>
  );
}
