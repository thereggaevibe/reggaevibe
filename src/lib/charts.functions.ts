import { createServerFn } from "@tanstack/react-start";

/** Supabase occasionally rejects a freshly minted internal token when its own
 * gateway and database clocks drift apart ("JWT issued at future"). It clears
 * itself within a second, so retry rather than surfacing a broken page. */
const TRANSIENT_AUTH_ERROR = /jwt (issued at future|expired)/i;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Builds the weekly Top 5 @ 5 chart. The underlying SECURITY DEFINER routine
 * writes chart history, so it is only callable server-side.
 */
export const getTop5At5 = createServerFn({ method: "GET" })
  .inputValidator((data: { currentYearOnly?: boolean } | undefined) => ({
    currentYearOnly: data?.currentYearOnly !== false,
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let lastError: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: rows, error } = await supabaseAdmin.rpc("top5_at5_chart", {
        _current_year_only: data.currentYearOnly,
      });
      if (!error) return rows ?? [];

      lastError = error.message;
      if (!TRANSIENT_AUTH_ERROR.test(error.message)) throw new Error(error.message);
      await sleep(250 * (attempt + 1));
    }

    // Still skewed: keep the page alive with an empty chart instead of a crash.
    console.error(`[top5_at5_chart] transient auth failure: ${lastError}`);
    return [];
  });
