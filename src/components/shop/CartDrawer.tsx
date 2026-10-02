import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatMoney, useCart } from "@/components/shop/cart-provider";
import { getPayPalClientId } from "@/lib/printful.functions";
import { ShopPayPalButtons } from "@/components/shop/ShopPayPalButtons";

type Shipping = {
  name: string;
  email: string;
  address1: string;
  city: string;
  stateCode: string;
  countryCode: string;
  zip: string;
};

const EMPTY_SHIPPING: Shipping = {
  name: "",
  email: "",
  address1: "",
  city: "",
  stateCode: "",
  countryCode: "US",
  zip: "",
};

export function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="group relative gap-0"
      onClick={() => setOpen(true)}
      aria-label={`View cart (${count} item${count === 1 ? "" : "s"})`}
    >
      <ShoppingBag />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-bold uppercase tracking-wider opacity-0 transition-all duration-300 group-hover:max-w-24 group-hover:pl-2 group-hover:opacity-100">
        Cart
      </span>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-background">
          {count}
        </span>
      )}
    </Button>
  );
}

export function CartDrawer() {
  const { lines, open, setOpen, subtotal, currency, setQuantity, removeLine, clear } = useCart();
  const [checkout, setCheckout] = useState(false);
  const [shipping, setShipping] = useState<Shipping>(EMPTY_SHIPPING);
  const clientIdQuery = useQuery({
    queryKey: ["paypal-client-id"],
    queryFn: () => getPayPalClientId(),
    staleTime: Infinity,
  });

  const finish = () => {
    clear();
    setCheckout(false);
    setShipping(EMPTY_SHIPPING);
    setOpen(false);
  };

  const field = (key: keyof Shipping, label: string, props: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`ship-${key}`} className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Input
        id={`ship-${key}`}
        value={shipping[key]}
        onChange={(e) => setShipping((prev) => ({ ...prev, [key]: e.target.value }))}
        {...props}
      />
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex h-full max-h-screen w-full flex-col gap-0 overflow-y-auto overscroll-contain sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-display text-2xl uppercase tracking-wide">Your cart</SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingBag className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nothing in the cart yet. Grab some Reggae Vibe merch.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {lines.map((line) => (
                <div key={line.syncVariantId} className="flex gap-3 rounded-xl border border-border bg-card p-3">
                  {line.image ? (
                    <img
                      src={line.image}
                      alt={`${line.productName} — ${line.variantLabel}`}
                      className="size-16 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="size-16 rounded-lg bg-secondary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{line.productName}</p>
                    <p className="truncate text-xs text-muted-foreground">{line.variantLabel}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="size-7"
                        onClick={() => setQuantity(line.syncVariantId, line.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">{line.quantity}</span>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="size-7"
                        onClick={() => setQuantity(line.syncVariantId, line.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto size-7 text-muted-foreground"
                        onClick={() => removeLine(line.syncVariantId)}
                        aria-label={`Remove ${line.productName}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-gold">{formatMoney(line.price * line.quantity, line.currency)}</p>
                </div>
              ))}

              {checkout && (
                <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gold">Shipping details</p>
                  {field("name", "Full name", { autoComplete: "name" })}
                  {field("email", "Email", { type: "email", autoComplete: "email" })}
                  {field("address1", "Address", { autoComplete: "address-line1" })}
                  <div className="grid grid-cols-2 gap-3">
                    {field("city", "City", { autoComplete: "address-level2" })}
                    {field("stateCode", "State code", { placeholder: "NY", maxLength: 3 })}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {field("zip", "ZIP / postcode", { autoComplete: "postal-code" })}
                    {field("countryCode", "Country code", { placeholder: "US", maxLength: 2 })}
                  </div>
                </div>
              )}
            </div>

            <Separator />
            <div className="space-y-3 px-4 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-lg font-bold text-gold">{formatMoney(subtotal, currency)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Shipping is calculated at checkout by our print partner before you pay.
              </p>
              {checkout ? (
                <div className="grid gap-2">
                  {(() => {
                    const ready =
                      shipping.name.trim() &&
                      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(shipping.email) &&
                      shipping.address1.trim() &&
                      shipping.city.trim() &&
                      shipping.countryCode.trim() &&
                      shipping.zip.trim();
                    const clientId = clientIdQuery.data?.clientId;
                    if (!ready) {
                      return (
                        <p className="rounded-lg border border-border bg-surface p-3 text-xs text-muted-foreground">
                          Fill in your shipping details above to pay with PayPal, debit or credit card.
                        </p>
                      );
                    }
                    if (!clientId) {
                      return (
                        <p className="text-xs text-muted-foreground">
                          {clientIdQuery.isLoading ? "Loading secure payment…" : "Payments are not configured yet."}
                        </p>
                      );
                    }
                    return (
                      <ShopPayPalButtons
                        clientId={clientId}
                        items={lines.map((l) => ({ syncVariantId: l.syncVariantId, quantity: l.quantity }))}
                        shipping={{ ...shipping, stateCode: shipping.stateCode || undefined }}
                        onPaid={finish}
                      />
                    );
                  })()}
                  <Button variant="ghost" onClick={() => setCheckout(false)}>
                    Back to cart
                  </Button>
                </div>
              ) : (
                <Button className="w-full" onClick={() => setCheckout(true)}>
                  Checkout
                </Button>
              )}

            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
