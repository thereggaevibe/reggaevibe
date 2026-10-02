import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VideoCategory = {
  id: string;
  name: string;
  slug: string;
  playlist_id: string;
  sort_order: number;
  is_active: boolean;
};

const SELECT = "id, name, slug, playlist_id, sort_order, is_active";

/** Video categories for the visuals sidebar. Set activeOnly for the public page. */
export const videoCategoriesQuery = (activeOnly = true) =>
  queryOptions({
    queryKey: ["video-categories", activeOnly],
    queryFn: async (): Promise<VideoCategory[]> => {
      let query = supabase.from("video_categories").select(SELECT).order("sort_order", { ascending: true });
      if (activeOnly) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as VideoCategory[];
    },
    staleTime: 300_000,
  });

/** Turns a category name into a URL-safe slug. */
export function slugifyCategory(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Accepts a full YouTube playlist URL or a bare playlist ID. */
export function parsePlaylistId(input: string) {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/[?&]list=([\w-]+)/)?.[1];
  return fromUrl ?? trimmed;
}
