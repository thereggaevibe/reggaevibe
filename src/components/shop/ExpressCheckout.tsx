import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Express wallet buttons. Wallet availability is detected in the browser, so we
 * only advertise Apple Pay / Google Pay where the device can actually offer it.
 * Selecting a wallet drops the item in the cart and opens checkout with that
 * wallet pre-selected for the fulfillment step.
 */
export type Wallet = "apple" | "google";

function useWallets(): Wallet[] {
  const [wallets, setWallets] = useState<Wallet[]>([]);

  useEffect(() => {
    const found: Wallet[] = [];
    const applePay = (window as unknown as { ApplePaySession?: { canMakePayments?: () => boolean } })
      .ApplePaySession;
    if (applePay?.canMakePayments?.()) found.push("apple");
    if (typeof window.PaymentRequest === "function") found.push("google");
    setWallets(found);
  }, []);

  return wallets;
}

export function ExpressCheckoutButtons({
  disabled,
  onSelect,
}: {
  disabled?: boolean;
  onSelect: (wallet: Wallet) => void;
}) {
  const wallets = useWallets();
  if (!wallets.length) return null;

  return (
    <div className="grid gap-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Express checkout</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {wallets.includes("apple") && (
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => onSelect("apple")}
            className="h-11 gap-2 border border-border font-semibold"
          >
            <AppleMark /> Pay
          </Button>
        )}
        {wallets.includes("google") && (
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => onSelect("google")}
            className="h-11 gap-2 border border-border font-semibold"
          >
            <GoogleMark /> Pay
          </Button>
        )}
      </div>
    </div>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M16.4 12.9c0-2.2 1.8-3.3 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.6 2.3 2.8 2.2 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.8-2.2.6-.9.9-1.4 1.3-2.4-2.5-.9-2.7-3.9-2.7-3.9zM14.3 5.8c.6-.8 1.1-1.9 1-3-1 0-2.2.7-2.9 1.5-.6.7-1.1 1.8-1 2.9 1.1.1 2.2-.6 2.9-1.4z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a6 6 0 0 1-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"
      />
      <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.8V7.6H3.1a10 10 0 0 0 0 8.9L6.4 14z" />
      <path
        fill="#EA4335"
        d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.6l3.3 2.6A6 6 0 0 1 12 6.1z"
      />
    </svg>
  );
}
