import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  sender_name: z.string().trim().min(2).max(80),
  sender_email: z.string().trim().email().max(160).optional().or(z.literal("")),
  message: z.string().trim().min(5).max(1000),
});

/** Stores a listener shoutout in the station inbox (Control Room). */
export const sendShoutout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("shoutouts").insert({
      sender_name: data.sender_name,
      sender_email: data.sender_email || null,
      message: data.message,
    });
    if (error) return { ok: false as const, error: "Could not send your shoutout right now." };
    return { ok: true as const };
  });
