/**
 * OneSignal Web SDK (v16) helpers.
 * The App ID is a public value, so it lives in code; the REST API key stays server-side.
 */
export const ONESIGNAL_APP_ID = "06151e6e-20bc-45ea-9b32-6eaf9c301fa4";

const SDK_URL = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";

type OneSignalLike = {
  init: (options: Record<string, unknown>) => Promise<void>;
  User: { PushSubscription: { optedIn?: boolean; id?: string | null; optIn: () => Promise<void>; optOut: () => Promise<void> } };
  Notifications: {
    permission: boolean;
    permissionNative?: NotificationPermission;
    requestPermission: () => Promise<void>;
    addEventListener: (event: string, cb: (payload: unknown) => void) => void;
  };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(os: OneSignalLike) => void | Promise<void>>;
    OneSignal?: OneSignalLike;
  }
}

let initPromise: Promise<OneSignalLike | null> | null = null;

/** True when this browser can register a push service worker at all. */
export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Loads and initialises the OneSignal SDK once per page. Safe to call repeatedly. */
export function initOneSignal(): Promise<OneSignalLike | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!pushSupported()) return Promise.resolve(null);
  if (initPromise) return initPromise;

  initPromise = new Promise<OneSignalLike | null>((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: "OneSignalSDKWorker.js",
          serviceWorkerParam: { scope: "/" },
          notifyButton: { enable: false },
          // We drive the opt-in from our own in-page prompt.
          promptOptions: { slidedown: { prompts: [] } },
        });
        resolve(OneSignal);
      } catch (error) {
        console.error("OneSignal init failed", error);
        resolve(null);
      }
    });

    if (!document.querySelector(`script[src="${SDK_URL}"]`)) {
      const script = document.createElement("script");
      script.src = SDK_URL;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return initPromise;
}

/** Current subscription state for the visitor. */
export async function getPushState(): Promise<{ supported: boolean; subscribed: boolean; blocked: boolean }> {
  if (!pushSupported()) return { supported: false, subscribed: false, blocked: false };
  const os = await initOneSignal();
  if (!os) return { supported: false, subscribed: false, blocked: false };
  const blocked = typeof Notification !== "undefined" && Notification.permission === "denied";
  return { supported: true, subscribed: Boolean(os.User.PushSubscription.optedIn), blocked };
}

/** Asks for permission (if needed) and opts the visitor in to station notifications. */
export async function subscribeToPush(): Promise<boolean> {
  const os = await initOneSignal();
  if (!os) return false;
  if (!os.Notifications.permission) {
    await os.Notifications.requestPermission();
  }
  await os.User.PushSubscription.optIn();
  return Boolean(os.User.PushSubscription.optedIn);
}

/** Turns station notifications off for this browser. */
export async function unsubscribeFromPush(): Promise<void> {
  const os = await initOneSignal();
  if (!os) return;
  await os.User.PushSubscription.optOut();
}
