import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public catalog: published Printful store products. */
export const listShopProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchStoreProducts } = await import("@/lib/printful.server");
  try {
    return { products: await fetchStoreProducts(), error: null as string | null };
  } catch (err) {
    return { products: [], error: err instanceof Error ? err.message : "Shop is unavailable" };
  }
});

/** Public: one product with its variants (sizes, colors, prices, mockups). */
export const getShopProduct = createServerFn({ method: "POST" })
  .inputValidator((data: { productId: number }) => {
    if (!Number.isInteger(data.productId) || data.productId <= 0) throw new Error("Invalid product");
    return data;
  })
  .handler(async ({ data }) => {
    const { fetchStoreProduct } = await import("@/lib/printful.server");
    try {
      return { product: await fetchStoreProduct(data.productId), error: null as string | null };
    } catch (err) {
      return { product: null, error: err instanceof Error ? err.message : "Product is unavailable" };
    }
  });

export type CartLineInput = { syncVariantId: number; quantity: number };
export type ShippingInput = {
  name: string;
  email: string;
  address1: string;
  city: string;
  stateCode?: string | undefined;
  countryCode: string;
  zip: string;
};

function validateCheckout(data: { items: CartLineInput[]; shipping: ShippingInput }) {
  if (!Array.isArray(data.items) || data.items.length === 0) throw new Error("Your cart is empty");
  for (const item of data.items) {
    if (!Number.isInteger(item.syncVariantId) || item.syncVariantId <= 0) throw new Error("Invalid cart item");
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      throw new Error("Invalid quantity");
    }
  }
  const s = data.shipping;
  const required: Array<[string, string | undefined]> = [
    ["name", s?.name],
    ["email", s?.email],
    ["address", s?.address1],
    ["city", s?.city],
    ["country", s?.countryCode],
    ["ZIP / postcode", s?.zip],
  ];
  for (const [label, value] of required) {
    if (!value || !value.trim()) throw new Error(`Please enter your ${label}`);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email)) throw new Error("Please enter a valid email");
  return data;
}

function cleanRecipient(s: ShippingInput) {
  return {
    name: s.name.trim(),
    email: s.email.trim(),
    address1: s.address1.trim(),
    city: s.city.trim(),
    stateCode: s.stateCode?.trim() || undefined,
    countryCode: s.countryCode.trim().toUpperCase(),
    zip: s.zip.trim(),
  };
}

/** Public client id so the browser can render the official PayPal buttons. */
export const getPayPalClientId = createServerFn({ method: "GET" }).handler(async () => {
  return { clientId: process.env["PAYPAL_CLIENT_ID"] ?? null };
});

/**
 * Step 1 of checkout: price the cart on the server, create a PayPal order and
 * record it as pending. Nothing is sent to the print partner yet.
 */
export const createShopCheckout = createServerFn({ method: "POST" })
  .inputValidator(validateCheckout)
  .handler(async ({ data }) => {
    try {
      const { priceCartLines, estimateShippingCents } = await import("@/lib/printful.server");
      const { createPayPalShopOrder } = await import("@/lib/paypal.server");
      const recipient = cleanRecipient(data.shipping);

      const lines = await priceCartLines(data.items);
      const subtotal = lines.reduce((sum, l) => sum + l.unitCents * l.quantity, 0);
      const shippingCents = await estimateShippingCents(recipient, lines);
      const total = subtotal + shippingCents;

      const order = await createPayPalShopOrder("live", {
        subtotalCents: subtotal,
        shippingCents,
        totalCents: total,
        items: lines.map((l) => ({ name: l.name, quantity: l.quantity, unitCents: l.unitCents })),
        shipping: recipient,
      });

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("shop_orders").insert({
        provider_order_id: order.id,
        buyer_email: recipient.email,
        items: lines.map((l) => ({ syncVariantId: l.syncVariantId, quantity: l.quantity, unitCents: l.unitCents })),
        shipping: recipient,
        subtotal_cents: subtotal,
        shipping_cents: shippingCents,
        total_cents: total,
        status: "pending",
        environment: "live",
      } as never);
      if (error) throw new Error(error.message);

      return {
        orderId: order.id,
        subtotalCents: subtotal,
        shippingCents,
        totalCents: total,
        error: null as string | null,
      };
    } catch (err) {
      return {
        orderId: null,
        subtotalCents: 0,
        shippingCents: 0,
        totalCents: 0,
        error: err instanceof Error ? err.message : "Could not start checkout",
      };
    }
  });

/**
 * Step 2: capture the PayPal payment and only then push a confirmed
 * (ready-to-fulfill) order to the print partner.
 */
export const captureShopCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId || !/^[A-Za-z0-9-]{5,64}$/.test(data.orderId)) throw new Error("Invalid order");
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("shop_orders")
      .select("id, items, shipping, total_cents, status, printful_order_id")
      .eq("provider_order_id", data.orderId)
      .maybeSingle();
    const record = row as unknown as {
      id: string;
      items: Array<{ syncVariantId: number; quantity: number }>;
      shipping: ShippingInput;
      total_cents: number;
      status: string;
      printful_order_id: number | null;
    } | null;
    if (!record) return { paid: false, printfulOrderId: null, error: "We could not find that checkout" };
    if (record.status === "fulfilling" && record.printful_order_id) {
      return { paid: true, printfulOrderId: record.printful_order_id, error: null as string | null };
    }

    const { capturePayPalOrder, getPayPalCapture, getPayPalErrorMessage } = await import("@/lib/paypal.server");
    try {
      await capturePayPalOrder("live", data.orderId);
      const capture = await getPayPalCapture("live", data.orderId);
      const completed = capture.orderStatus === "COMPLETED" && capture.captureStatus === "COMPLETED";
      if (!completed) {
        await supabaseAdmin
          .from("shop_orders")
          .update({ status: "payment_failed" } as never)
          .eq("id", record.id);
        return { paid: false, printfulOrderId: null, error: "Your payment was not completed" };
      }
      if (capture.amountCents !== null && capture.amountCents < record.total_cents) {
        await supabaseAdmin.from("shop_orders").update({ status: "amount_mismatch" } as never).eq("id", record.id);
        return { paid: false, printfulOrderId: null, error: "Payment amount did not match the order" };
      }
      await supabaseAdmin.from("shop_orders").update({ status: "paid" } as never).eq("id", record.id);
    } catch (err) {
      return { paid: false, printfulOrderId: null, error: getPayPalErrorMessage(err) };
    }

    // Payment is confirmed — now, and only now, submit for fulfillment.
    try {
      const { createConfirmedOrder } = await import("@/lib/printful.server");
      const order = await createConfirmedOrder(
        cleanRecipient(record.shipping),
        record.items.map((i) => ({ syncVariantId: i.syncVariantId, quantity: i.quantity })),
        record.id,
      );
      await supabaseAdmin
        .from("shop_orders")
        .update({ status: "fulfilling", printful_order_id: order.orderId } as never)
        .eq("id", record.id);
      return { paid: true, printfulOrderId: order.orderId, error: null as string | null };
    } catch (err) {
      console.error("[Shop] fulfillment failed after payment", err);
      await supabaseAdmin.from("shop_orders").update({ status: "fulfillment_failed" } as never).eq("id", record.id);
      return {
        paid: true,
        printfulOrderId: null,
        error: "Payment received, but we could not reach fulfillment. The station has been notified.",
      };
    }
  });


/**
 * Admin-only: reads every store product's Printful blank type and creates a
 * matching shop category, assigning products that have no category yet.
 */
export const importPrintfulCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin");
    if (!roles?.length) throw new Error("Forbidden");

    const { fetchProductCategories } = await import("@/lib/printful.server");
    const pairs = await fetchProductCategories();
    if (!pairs.length) return { categories: 0, assigned: 0, error: "No Printful product types found" as string | null };

    const slug = (name: string) =>
      name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    const names = [...new Set(pairs.map((p) => p.category))];
    const { error: upsertError } = await context.supabase
      .from("shop_categories")
      .upsert(names.map((name) => ({ name, slug: slug(name), imported: true })), { onConflict: "slug" });
    if (upsertError) return { categories: 0, assigned: 0, error: upsertError.message as string | null };

    const { data: rows } = await context.supabase.from("shop_categories").select("id, slug");
    const bySlug = new Map((rows ?? []).map((r) => [r.slug, r.id]));

    const links = pairs
      .map((p) => ({ category_id: bySlug.get(slug(p.category)), printful_product_id: p.productId }))
      .filter((l): l is { category_id: string; printful_product_id: number } => Boolean(l.category_id));

    const { error: linkError } = await context.supabase
      .from("shop_product_categories")
      .upsert(links, { onConflict: "category_id,printful_product_id" });
    if (linkError) return { categories: names.length, assigned: 0, error: linkError.message as string | null };

    return { categories: names.length, assigned: links.length, error: null as string | null };
  });
