import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getPushState, initOneSignal, subscribeToPush, unsubscribeFromPush } from "@/lib/onesignal";

const DISMISS_KEY = "rv-push-prompt-dismissed";

/** Floating opt-in card asking listeners to turn on station alerts. */
export function PushSubscribePrompt() {
  const [visible, setVisible] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      await initOneSignal();
      const state = await getPushState();
      if (!active) return;
      setSubscribed(state.subscribed);
      const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
      setVisible(state.supported && !state.blocked && !state.subscribed && !dismissed);
    })();
    return () => {
      active = false;
    };
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  async function enable() {
    setBusy(true);
    try {
      const ok = await subscribeToPush();
      if (ok) {
        setSubscribed(true);
        setVisible(false);
        toast.success("Alerts on — we'll ping you when fresh vibes drop");
      } else {
        toast.error("Your browser blocked notifications. Allow them and try again.");
      }
    } catch {
      toast.error("We couldn't turn alerts on just now");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setSubscribed(false);
      toast.success("Alerts turned off");
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-28 left-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-gold/40 bg-card/95 p-4 shadow-xl backdrop-blur md:bottom-32">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notification prompt"
        className="absolute right-2 top-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-gold/15 p-2 text-gold">
          <Bell className="size-5" />
        </span>
        <div className="grid gap-2 pr-4">
          <p className="text-sm font-semibold">Never miss a drop</p>
          <p className="text-xs text-muted-foreground">
            Get alerts for new shows, chart movers and big news straight from the studio.
          </p>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => void enable()}>
              {busy ? "Turning on…" : "Turn on alerts"}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
      </div>
      {subscribed && (
        <Button size="sm" variant="ghost" className="mt-2" disabled={busy} onClick={() => void disable()}>
          <BellOff className="size-4" /> Turn off
        </Button>
      )}
    </div>
  );
}
