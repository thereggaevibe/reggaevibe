import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const GENRES = ["reggae", "dancehall", "soca", "afrobeats"] as const;
export type Genre = (typeof GENRES)[number];

export const RELEASE_TYPES = ["single", "ep", "album"] as const;
export type ReleaseType = (typeof RELEASE_TYPES)[number];

export type StoreStatus = "pending" | "approved" | "rejected";

export type ArtistStore = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  status: StoreStatus;
  created_at: string;
};

export type Release = {
  id: string;
  store_id: string;
  title: string;
  artist_name: string;
  release_type: ReleaseType;
  genre: Genre;
  description: string | null;
  cover_path: string | null;
  audio_path: string | null;
  preview_path: string | null;
  price_cents: number;
  release_year: number | null;
  status: string;
  created_at: string;
};

export type MusicOrder = {
  id: string;
  release_id: string | null;
  store_id: string | null;
  buyer_email: string | null;
  title_snapshot: string;
  gross_cents: number;
  commission_cents: number;
  net_cents: number;
  status: string;
  created_at: string;
};

const STORE_SELECT = "id, user_id, name, slug, bio, avatar_url, status, created_at";

const RELEASE_SELECT =
  "id, store_id, title, artist_name, release_type, genre, description, cover_path, audio_path, preview_path, price_cents, release_year, status, created_at";

export function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Signed URLs for cover art / preview clips in the public-read release-art bucket. */
export async function signArtPaths(paths: (string | null)[]): Promise<Map<string, string>> {
  const wanted = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (!wanted.length) return new Map();
  const { data } = await supabase.storage.from("release-art").createSignedUrls(wanted, 60 * 60 * 6);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
  }
  return map;
}

export type ReleaseWithUrls = Release & { coverUrl: string; previewUrl: string };

async function withUrls(rows: Release[]): Promise<ReleaseWithUrls[]> {
  const urls = await signArtPaths(rows.flatMap((r) => [r.cover_path, r.preview_path]));
  return rows.map((r) => ({
    ...r,
    coverUrl: (r.cover_path && urls.get(r.cover_path)) || "",
    previewUrl: (r.preview_path && urls.get(r.preview_path)) || "",
  }));
}

/** Every published release from approved artist stores. */
export const marketplaceQuery = () =>
  queryOptions({
    queryKey: ["releases", "marketplace"],
    queryFn: async (): Promise<ReleaseWithUrls[]> => {
      const { data, error } = await supabase
        .from("releases")
        .select(RELEASE_SELECT)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return withUrls((data ?? []) as Release[]);
    },
    staleTime: 60_000,
  });

/** The signed-in user's own artist store (any status). */
export const myStoreQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["artist-store", userId ?? "anon"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ArtistStore | null> => {
      const { data, error } = await supabase
        .from("artist_stores")
        .select(STORE_SELECT)
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as ArtistStore) ?? null;
    },
  });

export const storeReleasesQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["releases", "store", storeId ?? "none"],
    enabled: Boolean(storeId),
    queryFn: async (): Promise<ReleaseWithUrls[]> => {
      const { data, error } = await supabase
        .from("releases")
        .select(RELEASE_SELECT)
        .eq("store_id", storeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return withUrls((data ?? []) as Release[]);
    },
  });

export const storeOrdersQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["music-orders", storeId ?? "none"],
    enabled: Boolean(storeId),
    queryFn: async (): Promise<MusicOrder[]> => {
      const { data, error } = await supabase
        .from("music_orders")
        .select("id, release_id, store_id, buyer_email, title_snapshot, gross_cents, commission_cents, net_cents, status, created_at")
        .eq("store_id", storeId!)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as MusicOrder[];
    },
  });

/** All artist stores — admin view for approving vendors. */
export const allStoresQuery = () =>
  queryOptions({
    queryKey: ["artist-stores", "all"],
    queryFn: async (): Promise<ArtistStore[]> => {
      const { data, error } = await supabase
        .from("artist_stores")
        .select(STORE_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ArtistStore[];
    },
  });

/** Uploads a file to a private bucket and returns its storage path. */
export async function uploadMusicFile(bucket: "release-art" | "release-audio", folder: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function toCsv(rows: MusicOrder[]) {
  const header = ["Order date", "Track / release", "Buyer", "Gross", "Commission", "Net earnings"];
  const body = rows.map((r) => [
    new Date(r.created_at).toISOString(),
    r.title_snapshot,
    r.buyer_email ?? "",
    (r.gross_cents / 100).toFixed(2),
    (r.commission_cents / 100).toFixed(2),
    (r.net_cents / 100).toFixed(2),
  ]);
  return [header, ...body].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}
