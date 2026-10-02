import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";

/** Square house ad inviting visitors to buy the slot. Hidden for VIP members (ad-free perk). */
export function AdvertiseCard({ label = "Advertise here" }: { label?: string }) {
  const { isVip } = useSubscription();
  if (isVip) return null;

  return (
    <aside className="panel relative aspect-square overflow-hidden rounded-2xl border-2 border-dashed border-gold/50 bg-gradient-to-br from-rasta-green/25 via-background to-rasta-red/25 p-5">

      <div className="rasta-stripe absolute inset-x-0 top-0 h-1" />
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <Megaphone className="size-9 text-gold" />
        <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-gold">{label}</p>
        <h3 className="text-2xl leading-tight md:text-3xl">Your brand on Reggae Vibe Radio</h3>
        <p className="text-xs text-muted-foreground">
          Reach thousands of reggae and dancehall listeners every week. This spot could be yours.
        </p>
        <Button asChild size="sm">
          <a href="mailto:mail@thereggaevibe.com?subject=Advertising%20on%20Reggae%20Vibe%20Radio">Book this spot</a>
        </Button>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">202-670-8423</p>
      </div>
    </aside>
  );
}
