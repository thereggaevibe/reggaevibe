import { useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { toast } from "sonner";
import { createShopCheckout, captureShopCheckout, type CartLineInput, type ShippingInput } from "@/lib/printful.functions";

/**
 * Official PayPal Checkout buttons for the merch cart. The order is created and
 * priced on the server, the buyer pays inside PayPal, and fulfillment only
 * happens after the capture comes back COMPLETED.
 */
export function ShopPayPalButtons({
  clientId,
  items,
  shipping,
  onPaid,
}: {
  clientId: string;
  items: CartLineInput[];
  shipping: ShippingInput;
  onPaid: () => void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <PayPalScriptProvider
      options={{ clientId, currency: "USD", intent: "capture", components: "buttons" }}
    >
      <div className={busy ? "pointer-events-none opacity-60" : undefined}>
        <PayPalButtons
          style={{ layout: "vertical", shape: "rect", label: "paypal", height: 45 }}
          disabled={busy || items.length === 0}
          createOrder={async () => {
            const result = await createShopCheckout({ data: { items, shipping } });
            if (result.error || !result.orderId) {
              toast.error(result.error ?? "Could not start checkout");
              throw new Error(result.error ?? "Could not start checkout");
            }
            return result.orderId;
          }}
          onApprove={async (data) => {
            setBusy(true);
            try {
              const result = await captureShopCheckout({ data: { orderId: data.orderID } });
              if (!result.paid) {
                toast.error(result.error ?? "Payment could not be completed");
                return;
              }
              if (result.error) toast.warning(result.error);
              else
                toast.success("Payment complete — your order is in production", {
                  description: result.printfulOrderId ? `Fulfillment #${result.printfulOrderId}` : undefined,
                });
              onPaid();
            } finally {
              setBusy(false);
            }
          }}
          onError={(err) => {
            console.error("[PayPal]", err);
            toast.error("PayPal could not process the payment");
          }}
          onCancel={() => toast.info("Payment cancelled — your cart is still here")}
        />
      </div>
    </PayPalScriptProvider>
  );
}
