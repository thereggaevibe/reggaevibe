import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** The signed-in artist's own private store fields (never exposed through the Data API). */
export const getMyStorePrivate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ payoutEmail: string | null; commissionPct: number | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("artist_stores")
      .select("payout_email, commission_pct")
      .eq("user_id", context.userId)
      .maybeSingle();
    const row = data as { payout_email: string | null; commission_pct: number } | null;
    return { payoutEmail: row?.payout_email ?? null, commissionPct: row?.commission_pct ?? null };
  });

export type StorePrivateFields = { payoutEmail: string | null; commissionPct: number };

/** Admin-only: payout emails and commission rates keyed by store id, for the control room vendor list. */
export const listStorePrivateFields = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Record<string, StorePrivateFields>> => {
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("artist_stores").select("id, payout_email, commission_pct");
    const map: Record<string, StorePrivateFields> = {};
    for (const row of (data ?? []) as { id: string; payout_email: string | null; commission_pct: number }[]) {
      map[row.id] = { payoutEmail: row.payout_email, commissionPct: row.commission_pct };
    }
    return map;
  });
