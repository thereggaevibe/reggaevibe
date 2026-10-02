/**
 * Server-only Printful API client. The API key is read from the backend
 * environment at call time and never leaves the server.
 */
const PRINTFUL_BASE = "https://api.printful.com";

export type PrintfulVariant = {
  id: number;
  variantId: number;
  name: string;
  size: string | null;
  color: string | null;
  retailPrice: number;
  currency: string;
  image: string | null;
  available: boolean;
};

export type PrintfulProductSummary = {
  id: number;
  name: string;
  thumbnail: string | null;
  variantCount: number;
  fromPrice: number | null;
  currency: string;
};

export type PrintfulProductDetail = PrintfulProductSummary & {
  variants: PrintfulVariant[];
  /** Blank/catalog product description, when Printful exposes one. */
  description: string | null;
  /** All unique mockup images across the product's variants. */
  gallery: string[];
};

type PrintfulResponse<T> = { code: number; result: T; error?: { message?: string } };

async function printful<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env["PRINTFUL_API_KEY"];
  if (!apiKey) throw new Error("Printful is not configured");

  const res = await fetch(`${PRINTFUL_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await res.json().catch(() => null)) as PrintfulResponse<T> | null;
  if (!res.ok || !body) {
    const message = body?.error?.message ?? `Printful request failed (${res.status})`;
    console.error("[Printful]", path, message);
    throw new Error(message);
  }
  return body.result;
}

type RawSyncProduct = {
  id: number;
  name: string;
  thumbnail_url?: string | null;
  variants?: number;
};

type RawSyncVariant = {
  id: number;
  external_id?: string;
  name: string;
  synced?: boolean;
  is_ignored?: boolean;
  retail_price?: string | null;
  currency?: string | null;
  variant_id: number;
  product?: { image?: string | null; name?: string | null } | null;
  files?: Array<{ type?: string; preview_url?: string | null; thumbnail_url?: string | null }> | null;
};

/**
 * Printful exposes options inside the blank product name, e.g.
 * "Bella + Canvas 6882GD | Women's Cropped Tee (Washed Black / S)".
 * The sync variant name is usually "<Store product> / S".
 */
function parseOptions(raw: RawSyncVariant): { size: string | null; color: string | null } {
  const blank = raw.product?.name ?? "";
  const match = blank.match(/\(([^()]*)\)\s*$/);
  if (match?.[1]) {
    const parts = match[1].split("/").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) return { color: parts[0] ?? null, size: parts[1] ?? null };
    if (parts.length === 1) return { color: parts[0] ?? null, size: null };
  }
  const tail = raw.name.split("/").slice(1).join("/").trim();
  return { color: null, size: tail || null };
}

function variantImage(variant: RawSyncVariant): string | null {
  const preview = variant.files?.find((f) => f.type === "preview" || f.type === "mockup");
  // Store thumbnails can point back to a removed WordPress upload. Printful's
  // own preview CDN is public and is the authoritative product mockup.
  return preview?.preview_url ?? preview?.thumbnail_url ?? variant.product?.image ?? null;
}

function mapVariant(raw: RawSyncVariant): PrintfulVariant {
  const { size, color } = parseOptions(raw);
  return {
    id: raw.id,
    variantId: raw.variant_id,
    name: raw.name,
    size,
    color,
    retailPrice: Number(raw.retail_price ?? 0),
    currency: raw.currency ?? "USD",
    image: variantImage(raw),
    available: raw.is_ignored !== true,
  };
}

const PRODUCT_CACHE_MS = 5 * 60 * 1000;
const productCache = new Map<number, { expiresAt: number; product: PrintfulProductDetail }>();
let catalogCache: { expiresAt: number; products: PrintfulProductSummary[] } | null = null;

async function fetchRawStoreProduct(productId: number) {
  return printful<{ sync_product: RawSyncProduct; sync_variants: RawSyncVariant[] }>(
    `/sync/products/${productId}`,
  );
}

/** Published store products enriched with publicly accessible Printful mockups. */
export async function fetchStoreProducts(): Promise<PrintfulProductSummary[]> {
  if (catalogCache && catalogCache.expiresAt > Date.now()) return catalogCache.products;
  const products = await printful<RawSyncProduct[]>("/sync/products?limit=100");

  const summaries: PrintfulProductSummary[] = [];
  for (let offset = 0; offset < products.length; offset += 4) {
    const batch = products.slice(offset, offset + 4);
    const resolved = await Promise.all(
      batch.map(async (product): Promise<PrintfulProductSummary> => {
        try {
          const result = await fetchRawStoreProduct(product.id);
          const variants = (result.sync_variants ?? []).map(mapVariant).filter((variant) => variant.available);
          const prices = variants.map((variant) => variant.retailPrice).filter((price) => price > 0);
          return {
            id: product.id,
            name: product.name,
            thumbnail: variants[0]?.image ?? null,
            variantCount: variants.length,
            fromPrice: prices.length ? Math.min(...prices) : null,
            currency: variants[0]?.currency ?? "USD",
          };
        } catch {
          return {
            id: product.id,
            name: product.name,
            thumbnail: null,
            variantCount: product.variants ?? 0,
            fromPrice: null,
            currency: "USD",
          };
        }
      }),
    );
    summaries.push(...resolved);
  }
  catalogCache = { expiresAt: Date.now() + PRODUCT_CACHE_MS, products: summaries };
  return summaries;
}

/** Every mockup/preview image across the product's variants, de-duplicated. */
function buildGallery(raws: RawSyncVariant[]): string[] {
  const seen = new Set<string>();
  for (const raw of raws) {
    for (const file of raw.files ?? []) {
      if (file.type !== "preview" && file.type !== "mockup") continue;
      const url = file.preview_url ?? file.thumbnail_url;
      if (url) seen.add(url);
    }
    if (raw.product?.image) seen.add(raw.product.image);
  }
  return [...seen];
}

/** Blank product description from the Printful catalog (best effort). */
async function fetchCatalogDescription(catalogVariantId: number | undefined): Promise<string | null> {
  if (!catalogVariantId) return null;
  try {
    const result = await printful<{ product?: { description?: string | null } }>(
      `/products/variant/${catalogVariantId}`,
    );
    return result.product?.description?.trim() || null;
  } catch {
    return null;
  }
}

/** One product with all of its purchasable variants and mockups. */
export async function fetchStoreProduct(productId: number): Promise<PrintfulProductDetail> {
  const cached = productCache.get(productId);
  if (cached && cached.expiresAt > Date.now()) return cached.product;

  const result = await fetchRawStoreProduct(productId);

  const rawVariants = result.sync_variants ?? [];
  const variants = rawVariants.map(mapVariant).filter((v) => v.available);
  const prices = variants.map((v) => v.retailPrice).filter((p) => p > 0);
  const thumbnail = variants[0]?.image ?? null;
  const gallery = buildGallery(rawVariants);
  const description = await fetchCatalogDescription(variants[0]?.variantId);

  const product = {
    id: result.sync_product.id,
    name: result.sync_product.name,
    thumbnail,
    variantCount: variants.length,
    fromPrice: prices.length ? Math.min(...prices) : null,
    currency: variants[0]?.currency ?? "USD",
    variants,
    description,
    gallery: thumbnail && !gallery.includes(thumbnail) ? [thumbnail, ...gallery] : gallery,
  };
  productCache.set(productId, { expiresAt: Date.now() + PRODUCT_CACHE_MS, product });
  return product;
}

/**
 * Best-effort product category from Printful's blank product name, e.g.
 * "Bella + Canvas 3001 | Unisex T-Shirt (Black / S)" -> "Unisex T-Shirt".
 */
function blankCategory(blankName: string | null | undefined): string | null {
  if (!blankName) return null;
  const withoutOptions = blankName.replace(/\([^()]*\)\s*$/, "").trim();
  const parts = withoutOptions.split("|").map((p) => p.trim()).filter(Boolean);
  const candidate = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  return candidate?.trim() || null;
}

/** Every store product with the Printful blank category it was printed on. */
export async function fetchProductCategories(): Promise<Array<{ productId: number; category: string }>> {
  const products = await printful<RawSyncProduct[]>("/sync/products?limit=100");
  const out: Array<{ productId: number; category: string }> = [];

  for (const product of products) {
    try {
      const detail = await printful<{ sync_variants: RawSyncVariant[] }>(`/sync/products/${product.id}`);
      const category = blankCategory(detail.sync_variants?.[0]?.product?.name ?? null);
      if (category) out.push({ productId: product.id, category });
    } catch {
      // Skip products Printful can't expand; the admin can categorise them manually.
    }
  }
  return out;
}


export type PrintfulOrderItem = { syncVariantId: number; quantity: number };
export type PrintfulRecipient = {
  name: string;
  email: string;
  address1: string;
  city: string;
  stateCode?: string | undefined;
  countryCode: string;
  zip: string;
};

/**
 * Pushes a draft order to Printful (confirm = false, so nothing is charged or
 * fulfilled until it is confirmed). Returns Printful's costs and order id.
 */
export async function createDraftOrder(recipient: PrintfulRecipient, items: PrintfulOrderItem[]) {
  const result = await printful<{
    id: number;
    external_id?: string | null;
    status: string;
    costs?: { total?: string; subtotal?: string; shipping?: string; tax?: string; currency?: string };
  }>("/orders?confirm=false", {
    method: "POST",
    body: JSON.stringify({
      recipient: {
        name: recipient.name,
        email: recipient.email,
        address1: recipient.address1,
        city: recipient.city,
        state_code: recipient.stateCode,
        country_code: recipient.countryCode,
        zip: recipient.zip,
      },
      items: items.map((item) => ({ sync_variant_id: item.syncVariantId, quantity: item.quantity })),
    }),
  });

  return {
    orderId: result.id,
    status: result.status,
    total: result.costs?.total ?? null,
    shipping: result.costs?.shipping ?? null,
    tax: result.costs?.tax ?? null,
    currency: result.costs?.currency ?? "USD",
  };
}

/* ------------------------------------------------------------------ */
/* Server-side pricing (never trust prices sent by the browser)        */
/* ------------------------------------------------------------------ */

export type PricedLine = {
  syncVariantId: number;
  catalogVariantId: number;
  quantity: number;
  name: string;
  unitCents: number;
  currency: string;
};

/** Looks each sync variant up on Printful and returns authoritative pricing. */
export async function priceCartLines(items: PrintfulOrderItem[]): Promise<PricedLine[]> {
  const lines: PricedLine[] = [];
  for (const item of items) {
    const result = await printful<{ sync_variant: RawSyncVariant }>(`/sync/variant/${item.syncVariantId}`);
    const raw = result.sync_variant;
    if (!raw || raw.is_ignored === true) throw new Error("One of the items is no longer available");
    const unitCents = Math.round(Number(raw.retail_price ?? 0) * 100);
    if (!unitCents) throw new Error("One of the items has no price set");
    lines.push({
      syncVariantId: raw.id,
      catalogVariantId: raw.variant_id,
      quantity: item.quantity,
      name: raw.name,
      unitCents,
      currency: raw.currency ?? "USD",
    });
  }
  return lines;
}

/** Cheapest shipping rate for the cart, in cents. Falls back to a flat rate. */
export async function estimateShippingCents(recipient: PrintfulRecipient, lines: PricedLine[]): Promise<number> {
  try {
    const rates = await printful<Array<{ rate?: string }>>("/shipping/rates", {
      method: "POST",
      body: JSON.stringify({
        recipient: {
          address1: recipient.address1,
          city: recipient.city,
          state_code: recipient.stateCode,
          country_code: recipient.countryCode,
          zip: recipient.zip,
        },
        items: lines.map((l) => ({ variant_id: l.catalogVariantId, quantity: l.quantity })),
        currency: "USD",
      }),
    });
    const cents = rates
      .map((r) => Math.round(Number(r.rate ?? 0) * 100))
      .filter((c) => c > 0)
      .sort((a, b) => a - b);
    if (cents.length) return cents[0]!;
  } catch (err) {
    console.error("[Printful] shipping rates unavailable", err);
  }
  return 595;
}

/**
 * Creates a confirmed (ready-to-fulfill) Printful order. Only call this after
 * the buyer's payment has been captured.
 */
export async function createConfirmedOrder(
  recipient: PrintfulRecipient,
  items: PrintfulOrderItem[],
  externalId: string,
) {
  const result = await printful<{
    id: number;
    status: string;
    costs?: { total?: string; shipping?: string; tax?: string; currency?: string };
  }>("/orders?confirm=true", {
    method: "POST",
    body: JSON.stringify({
      external_id: externalId,
      recipient: {
        name: recipient.name,
        email: recipient.email,
        address1: recipient.address1,
        city: recipient.city,
        state_code: recipient.stateCode,
        country_code: recipient.countryCode,
        zip: recipient.zip,
      },
      items: items.map((item) => ({ sync_variant_id: item.syncVariantId, quantity: item.quantity })),
    }),
  });

  return {
    orderId: result.id,
    status: result.status,
    total: result.costs?.total ?? null,
    shipping: result.costs?.shipping ?? null,
    tax: result.costs?.tax ?? null,
    currency: result.costs?.currency ?? "USD",
  };
}
