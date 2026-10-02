import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ShopCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  imported: boolean;
};

export type ShopProductLink = { category_id: string; printful_product_id: number };

/** All merch categories, ordered for the shop filter bar. */
export const shopCategoriesQuery = () =>
  queryOptions({
    queryKey: ["shop-categories"],
    queryFn: async (): Promise<ShopCategory[]> => {
      const { data, error } = await supabase
        .from("shop_categories")
        .select("id, name, slug, sort_order, imported")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ShopCategory[];
    },
    staleTime: 300_000,
  });

/** Which Printful products belong to which category. */
export const shopProductLinksQuery = () =>
  queryOptions({
    queryKey: ["shop-product-categories"],
    queryFn: async (): Promise<ShopProductLink[]> => {
      const { data, error } = await supabase.from("shop_product_categories").select("category_id, printful_product_id");
      if (error) throw error;
      return (data ?? []).map((row) => ({
        category_id: row.category_id,
        printful_product_id: Number(row.printful_product_id),
      }));
    },
    staleTime: 300_000,
  });

/** Turns a category name into a URL-safe slug. */
export function slugifyShopCategory(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
