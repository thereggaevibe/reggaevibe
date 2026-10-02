import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DownloadCloud, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { importPrintfulCategories, listShopProducts } from "@/lib/printful.functions";
import { shopCategoriesQuery, shopProductLinksQuery, slugifyShopCategory } from "@/lib/shop-categories-queries";

const NONE = "__none__";

/** Admin: create shop categories, import them from Printful, and file products. */
export function ShopCategoriesPanel() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const { data: categories = [] } = useQuery(shopCategoriesQuery());
  const { data: links = [] } = useQuery(shopProductLinksQuery());
  const { data: catalog } = useQuery({
    queryKey: ["shop", "products"],
    queryFn: () => listShopProducts(),
    staleTime: 300_000,
  });
  const runImport = useServerFn(importPrintfulCategories);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["shop-categories"] });
    void queryClient.invalidateQueries({ queryKey: ["shop-product-categories"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Enter a category name");
      const { error } = await supabase
        .from("shop_categories")
        .insert({ name: trimmed, slug: slugifyShopCategory(trimmed), sort_order: categories.length });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      toast.success("Category added");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shop_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category removed");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const assign = useMutation({
    mutationFn: async ({ productId, categoryId }: { productId: number; categoryId: string | null }) => {
      const { error: clearError } = await supabase
        .from("shop_product_categories")
        .delete()
        .eq("printful_product_id", productId);
      if (clearError) throw clearError;
      if (categoryId) {
        const { error } = await supabase
          .from("shop_product_categories")
          .insert({ printful_product_id: productId, category_id: categoryId });
        if (error) throw error;
      }
    },
    onSuccess: () => refresh(),
    onError: (error: Error) => toast.error(error.message),
  });

  const importing = useMutation({
    mutationFn: async () => runImport({}),
    onSuccess: (result) => {
      if (result.error) toast.error(result.error);
      else toast.success(`Imported ${result.categories} categories · ${result.assigned} products filed`);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const categoryOf = (productId: number) => links.find((l) => l.printful_product_id === productId)?.category_id ?? NONE;
  const products = catalog?.products ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <section className="panel rounded-xl p-5">
        <h3 className="text-2xl">Shop categories</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Import the product types from Printful or create your own to filter the shop.
        </p>

        <Button
          className="mt-4 w-full"
          variant="secondary"
          disabled={importing.isPending}
          onClick={() => importing.mutate()}
        >
          <DownloadCloud /> {importing.isPending ? "Importing…" : "Import from Printful"}
        </Button>

        <div className="mt-5 grid gap-2">
          <Label htmlFor="shop-category-name">New category</Label>
          <div className="flex gap-2">
            <Input
              id="shop-category-name"
              value={name}
              placeholder="e.g. Hoodies"
              onChange={(event) => setName(event.target.value)}
            />
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              <Plus />
            </Button>
          </div>
        </div>

        <ul className="mt-5 divide-y divide-border">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{category.name}</p>
                <p className="text-xs text-muted-foreground">
                  {links.filter((l) => l.category_id === category.id).length} products
                  {category.imported ? " · from Printful" : ""}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(category.id)} aria-label="Delete category">
                <Trash2 className="text-rasta-red" />
              </Button>
            </li>
          ))}
          {!categories.length && <li className="py-3 text-sm text-muted-foreground">No categories yet.</li>}
        </ul>
      </section>

      <section className="panel rounded-xl p-5">
        <h3 className="text-2xl">Products</h3>
        <p className="mt-1 text-sm text-muted-foreground">Choose the category each product appears under.</p>
        <ul className="mt-4 divide-y divide-border">
          {products.map((product) => (
            <li key={product.id} className="flex items-center gap-3 py-3">
              {product.thumbnail && (
                <img src={product.thumbnail} alt="" width={40} height={40} className="size-10 rounded object-cover" />
              )}
              <p className="min-w-0 flex-1 truncate text-sm">{product.name}</p>
              <Select
                value={categoryOf(product.id)}
                onValueChange={(value) =>
                  assign.mutate({ productId: product.id, categoryId: value === NONE ? null : value })
                }
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Uncategorised" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Uncategorised</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          ))}
          {!products.length && <li className="py-3 text-sm text-muted-foreground">No Printful products found.</li>}
        </ul>
      </section>
    </div>
  );
}
