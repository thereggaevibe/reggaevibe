import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createPayPalOrder,
  getPayPalErrorMessage,
  type PayPalEnv,
} from "@/lib/paypal.server";

type CheckoutResult = { approveUrl: string } | { error: string };
type DownloadResult = { url: string } | { error: string };

const UUID = /^[0-9a-fA-F-]{36}$/;

/** Starts a PayPal order for one release and records a pending order. */
export const createReleaseCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { releaseId: string; returnUrl: string; environment: string }) => {
    if (!UUID.test(data.releaseId)) throw new Error("Invalid release");
    return { ...data, environment: data.environment === "live" ? "live" : "sandbox" };
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: release, error } = await supabaseAdmin
      .from("releases")
      .select("id, title, artist_name, price_cents, store_id, status, artist_stores(id, status, commission_pct)")
      .eq("id", data.releaseId)
      .maybeSingle();
    if (error || !release) return { error: "Release not found" };
    const store = release.artist_stores as unknown as { id: string; status: string; commission_pct: number } | null;
    if (release.status !== "published" || !store || store.status !== "approved") {
      return { error: "This release is not on sale" };
    }

    const gross = release.price_cents;
    const commission = Math.round((gross * store.commission_pct) / 100);

    try {
      const order = await createPayPalOrder(data.environment as PayPalEnv, {
        amountCents: gross,
        description: `${release.title} — ${release.artist_name}`,
        customId: userId,
        returnUrl: data.returnUrl,
        cancelUrl: `${data.returnUrl.split("?")[0]}?pp_cancel=1`,
      });

      await supabaseAdmin.from("music_orders").insert({
        release_id: release.id,
        store_id: store.id,
        buyer_user_id: userId,
        buyer_email: user?.email ?? null,
        title_snapshot: `${release.title} — ${release.artist_name}`,
        gross_cents: gross,
        commission_cents: commission,
        net_cents: gross - commission,
        status: "pending",
        provider_order_id: order.id,
        environment: data.environment,
      });

      return { approveUrl: order.approveUrl };
    } catch (err) {
      return { error: getPayPalErrorMessage(err) };
    }
  });

/** Temporary download link for a release the signed-in user has paid for. */
export const getReleaseDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { releaseId: string }) => {
    if (!UUID.test(data.releaseId)) throw new Error("Invalid release");
    return data;
  })
  .handler(async ({ data, context }): Promise<DownloadResult> => {
    const { supabase, userId } = context;
    const { data: order } = await supabase
      .from("music_orders")
      .select("id")
      .eq("release_id", data.releaseId)
      .eq("buyer_user_id", userId)
      .eq("status", "paid")
      .limit(1)
      .maybeSingle();
    if (!order) return { error: "No completed purchase found for this release" };

    const { data: release } = await supabase.from("releases").select("audio_path").eq("id", data.releaseId).maybeSingle();
    if (!release?.audio_path) return { error: "The artist has not attached an audio file yet" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("release-audio")
      .createSignedUrl(release.audio_path, 60 * 15);
    if (error || !signed) return { error: "Could not create a download link" };
    return { url: signed.signedUrl };
  });

/** Releases the signed-in user has bought, for the "my purchases" list. */
export const listMyPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("music_orders")
      .select("id, release_id, title_snapshot, gross_cents, created_at")
      .eq("buyer_user_id", context.userId)
      .eq("status", "paid")
      .order("created_at", { ascending: false });
    return data ?? [];
  });
