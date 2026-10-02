import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = {
  /** Printful sync_variant_id — what fulfillment needs. */
  syncVariantId: number;
  /** Printful catalog variant id, kept for reference. */
  variantId: number;
  productId: number;
  productName: string;
  variantLabel: string;
  image: string | null;
  price: number;
  currency: string;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  currency: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  addLine: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (syncVariantId: number, quantity: number) => void;
  removeLine: (syncVariantId: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "rvr-cart-v1";

function readStored(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed.filter((l) => Number.isInteger(l?.syncVariantId)) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(readStored());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage unavailable */
    }
  }, [lines, hydrated]);

  const addLine = useCallback((line: Omit<CartLine, "quantity">, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.syncVariantId === line.syncVariantId);
      if (existing) {
        return prev.map((l) =>
          l.syncVariantId === line.syncVariantId ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l,
        );
      }
      return [...prev, { ...line, quantity: Math.min(20, Math.max(1, quantity)) }];
    });
  }, []);

  const setQuantity = useCallback((syncVariantId: number, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.syncVariantId !== syncVariantId)
        : prev.map((l) => (l.syncVariantId === syncVariantId ? { ...l, quantity: Math.min(20, quantity) } : l)),
    );
  }, []);

  const removeLine = useCallback((syncVariantId: number) => {
    setLines((prev) => prev.filter((l) => l.syncVariantId !== syncVariantId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
    return {
      lines,
      count,
      subtotal,
      currency: lines[0]?.currency ?? "USD",
      open,
      setOpen,
      addLine,
      setQuantity,
      removeLine,
      clear,
    };
  }, [lines, open, addLine, setQuantity, removeLine, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}
