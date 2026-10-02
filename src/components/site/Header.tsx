import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Radio, ShieldCheck, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/site/SearchBox";
import { CompactHeaderPlayer } from "@/components/player/CompactHeaderPlayer";
import { CartButton } from "@/components/shop/CartDrawer";
import { useCart } from "@/components/shop/cart-provider";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";


const NAV = [
  { to: "/", label: "Radio" },
  { to: "/visuals", label: "Visuals" },
  { to: "/music", label: "Music" },
  { to: "/shop", label: "Shop" },
  { to: "/events", label: "Events" },
  { to: "/tv", label: "TV" },
  { to: "/magazine", label: "Magazine" },
] as const;



export function Header() {
  const [open, setOpen] = useState(false);
  const { count: cartCount, setOpen: setCartOpen } = useCart();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin(user);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="rasta-stripe h-1 w-full" />
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <CompactHeaderPlayer />

        <nav className="ml-auto hidden items-center gap-1 xl:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider text-gold bg-secondary" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:ml-2">
          <SearchBox />
          <CartButton />
          {isAdmin && (
            <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
              <Link to="/control-room">
                <ShieldCheck /> Control Room
              </Link>
            </Button>
          )}
          {user ? (
            <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
              <Link to="/my-vibe">
                <Radio /> My Vibe
              </Link>
            </Button>
          ) : (
            <Link
              to="/auth"
              aria-label="Sign In"
              className="group inline-flex h-9 items-center overflow-hidden rounded-full bg-primary px-2.5 text-primary-foreground shadow-md ring-2 ring-gold/60 transition-all duration-300 hover:bg-primary/90 hover:px-4"
            >
              <Users className="size-4 shrink-0" />
              <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-bold uppercase tracking-wider opacity-0 transition-all duration-300 group-hover:ml-2 group-hover:max-w-24 group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-24 group-focus-visible:opacity-100">
                Sign In
              </span>
            </Link>
          )}
          <Button variant="ghost" size="icon" className="xl:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-surface px-4 py-3 xl:hidden">
          <ul className="grid gap-1">
            {[...NAV, { to: "/auth", label: user ? "My Vibe" : "Sign in" }].map((item) => (
              <li key={item.label}>
                <Link
                  to={item.to === "/auth" && user ? "/my-vibe" : item.to}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setCartOpen(true);
                }}
                className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                Cart{cartCount > 0 ? ` (${cartCount})` : ""}
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
