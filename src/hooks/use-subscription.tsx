import { useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hasAccess, subscriptionQuery } from "@/lib/billing-queries";
import { useAuth } from "@/hooks/use-auth";

/** Current plan for the signed-in user, kept live via realtime updates. */
export function useSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery(subscriptionQuery(user?.id));
  // Several components mount this hook at once; Supabase reuses channels by
  // topic, so a shared topic makes the second `.on()` throw after subscribe().
  const instanceId = useId();

  useEffect(() => {
    if (!user?.id) return;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    try {
      channel = supabase
        .channel(`subscriptions:${user.id}:${instanceId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
          () => {
            void queryClient.invalidateQueries({ queryKey: ["subscription", user.id] });
          },
        )
        .subscribe();
    } catch (error) {
      // Realtime is a nice-to-have here; never break the page over it.
      console.warn("subscription realtime unavailable", error);
    }
    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, instanceId]);

  const subscription = query.data ?? null;
  return {
    subscription,
    plan: subscription?.price_id ?? null,
    isActive: hasAccess(subscription),
    isVip: hasAccess(subscription) && (subscription?.price_id ?? "").startsWith("vip_"),
    isArtistPro: hasAccess(subscription) && subscription?.price_id === "artist_store_pro_monthly",
    loading: query.isLoading,
  };
}
