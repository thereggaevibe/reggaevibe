/**
 * The site runs live-only PayPal checkout, so there is no test-mode banner.
 * Component kept as a no-op so existing mounts don't need to change.
 */
export function PaymentTestModeBanner() {
  return null;
}
