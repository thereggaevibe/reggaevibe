import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getPaymentsEnvironment } from "@/lib/payments-client";
import { createReleaseCheckout } from "@/lib/music.functions";
import { money } from "@/lib/music-queries";

type Props = {
  releaseId: string;
  title: string;
  priceCents: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReleaseCheckoutDialog({ releaseId, title, priceCents, open, onOpenChange }: Props) {
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const result = await createReleaseCheckout({
        data: {
          releaseId,
          environment: getPaymentsEnvironment(),
          returnUrl: `${window.location.origin}/music?pp_return=1`,
        },
      });
      if ("error" in result) throw new Error(result.error);
      window.location.assign(result.approveUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start PayPal checkout");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wide">{title}</DialogTitle>
          <DialogDescription>
            You will be redirected to PayPal to finish your purchase, then brought back to the Music Store.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 pb-2">
          <p className="font-display text-3xl text-foreground">{money(priceCents)}</p>
          <Button onClick={() => void start()} disabled={busy} className="w-full">
            {busy ? <Loader2 className="animate-spin" /> : null} Continue with PayPal
          </Button>
          <p className="text-center text-xs text-muted-foreground">Secure checkout powered by PayPal.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
