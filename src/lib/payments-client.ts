type PaymentsEnv = "sandbox" | "live";

/**
 * The station sells live only — no sandbox mode. All checkouts and
 * subscriptions go through the live PayPal environment.
 */
export function getPaymentsEnvironment(): PaymentsEnv {
  return "live";
}
