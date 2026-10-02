import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(500),
  url: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
});

/**
 * Broadcasts a push notification to every subscribed browser through the OneSignal REST API.
 * Admin-only: the caller's role is verified before anything is sent.
 */
export const sendPushNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden");

    const appId = process.env["ONESIGNAL_APP_ID"];
    const apiKey = process.env["ONESIGNAL_API_KEY"];
    if (!appId || !apiKey) {
      return { ok: false as const, error: "Push notifications are not configured yet." };
    }

    const payload: Record<string, unknown> = {
      app_id: appId,
      included_segments: ["Subscribed Users"],
      headings: { en: data.title },
      contents: { en: data.message },
    };
    if (data.url) payload["url"] = data.url;
    if (data.imageUrl) {
      payload["chrome_web_image"] = data.imageUrl;
      payload["big_picture"] = data.imageUrl;
    }

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => null)) as
      | { id?: string; recipients?: number; errors?: unknown }
      | null;

    if (!response.ok || !body?.id) {
      console.error("OneSignal broadcast failed", response.status, body);
      return { ok: false as const, error: "The notification could not be sent." };
    }

    return { ok: true as const, id: body.id, recipients: body.recipients ?? 0 };
  });
