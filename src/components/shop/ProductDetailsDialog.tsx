import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingBag, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ExpressCheckoutButtons, type Wallet } from "@/components/shop/ExpressCheckout";
import { formatMoney, useCart } from "@/components/shop/cart-provider";

export type DetailVariant = {
  id: number;
  variantId: number;
  name: string;
  size: string | null;
  color: string | null;
  retailPrice: number;
  currency: string;
  image: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  name: string;
  thumbnail: string | null;
  description: string | null;
  gallery: string[];
  variants: DetailVariant[];
  currency: string;
  isLoading?: boolean;
};

const ZOOM_STEPS = [1, 1.6, 2.4];

function variantLabel(variant: DetailVariant): string {
  return [variant.color, variant.size].filter(Boolean).join(" / ") || variant.name;
}

export function ProductDetailsDialog({
  open,
  onOpenChange,
  productId,
  name,
  thumbnail,
  description,
  gallery,
  variants,
  currency,
  isLoading,
}: Props) {
  const { addLine, setOpen: setCartOpen } = useCart();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(0);

  const images = useMemo(() => {
    const list = gallery.length ? gallery : thumbnail ? [thumbnail] : [];
    return list.slice(0, 24);
  }, [gallery, thumbnail]);

  const active = useMemo(
    () => variants.find((v) => v.id === selectedId) ?? variants[0],
    [variants, selectedId],
  );

  useEffect(() => {
    if (!open) {
      setZoom(0);
      setIndex(0);
    }
  }, [open]);

  // Follow the selected variant's mockup when it exists in the gallery.
  useEffect(() => {
    if (!active?.image) return;
    const found = images.indexOf(active.image);
    if (found >= 0) setIndex(found);
  }, [active?.image, images]);

  const price = active?.retailPrice ?? null;
  const activeCurrency = active?.currency ?? currency;
  const current = images[Math.min(index, Math.max(images.length - 1, 0))] ?? null;
  const scale = ZOOM_STEPS[zoom] ?? 1;

  const addToCart = () => {
    if (!active) return;
    addLine({
      syncVariantId: active.id,
      variantId: active.variantId,
      productId,
      productName: name,
      variantLabel: variantLabel(active),
      image: active.image ?? thumbnail,
      price: active.retailPrice,
      currency: active.currency,
    });
  };

  const onExpress = (wallet: Wallet) => {
    addToCart();
    onOpenChange(false);
    setCartOpen(true);
    toast.success(`${wallet === "apple" ? "Apple Pay" : "Google Pay"} selected`, {
      description: "Confirm your shipping details to finish checkout.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="text-display pr-8 text-xl uppercase tracking-wide">{name}</DialogTitle>
          <DialogDescription className="text-xs">
            {price ? `${formatMoney(price, activeCurrency)} · ` : ""}
            Printed on demand by our fulfillment partner
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[76vh] gap-0 overflow-y-auto md:grid-cols-2">
          {/* Gallery */}
          <div className="space-y-3 border-b border-border p-4 md:border-b-0 md:border-r">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-secondary">
              {current ? (
                <img
                  src={current}
                  alt={`${name} mockup ${index + 1}`}
                  className="size-full origin-center object-cover transition-transform duration-300"
                  style={{ transform: `scale(${scale})` }}
                  loading="lazy"
                />
              ) : (
                <div className="size-full" />
              )}

              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="Previous image"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="Next image"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setIndex((i) => (i + 1) % images.length)}
                  >
                    <ChevronRight />
                  </Button>
                </>
              )}

              <div className="absolute bottom-2 right-2 flex gap-1">
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Zoom out"
                  disabled={zoom === 0}
                  onClick={() => setZoom((z) => Math.max(0, z - 1))}
                >
                  <ZoomOut />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Zoom in"
                  disabled={zoom >= ZOOM_STEPS.length - 1}
                  onClick={() => setZoom((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))}
                >
                  <ZoomIn />
                </Button>
              </div>
            </div>

            {images.length > 1 && (
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {images.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => {
                        setIndex(i);
                        setZoom(0);
                      }}
                      className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                        i === index ? "border-gold" : "border-border"
                      }`}
                      aria-label={`Show image ${i + 1}`}
                    >
                      <img src={src} alt="" className="size-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4 p-4">
            <div>
              <p className="text-2xl font-bold text-gold">
                {price ? formatMoney(price, activeCurrency) : isLoading ? "…" : "—"}
              </p>
              {active && <p className="text-xs text-muted-foreground">{variantLabel(active)}</p>}
            </div>

            {variants.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Choose an option
                </p>
                <select
                  value={active?.id ?? ""}
                  onChange={(e) => setSelectedId(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold"
                  aria-label="Choose an option"
                >
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variantLabel(variant)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Separator />

            <div className="grid gap-2">
              <Button disabled={!active} onClick={() => {
                addToCart();
                toast.success("Added to cart");
                setCartOpen(true);
                onOpenChange(false);
              }}>
                <ShoppingBag /> Add to cart
              </Button>
              <ExpressCheckoutButtons disabled={!active} onSelect={onExpress} />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Description</p>
              {description ? (
                <div className="max-h-56 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {description}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "Loading product details…" : "Official Reggae Vibe Radio merch, printed on demand."}
                </p>
              )}
              <Badge variant="secondary" className="uppercase">
                {variants.length} option{variants.length === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
