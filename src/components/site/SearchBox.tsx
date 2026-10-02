import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";

/**
 * Header search: shows only the icon until hovered or focused, then expands
 * into an input that searches the site.
 */
export function SearchBox() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    void navigate({ to: "/search", search: { q: term } });
  };

  return (
    <form
      onSubmit={submit}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => !query && setOpen(false)}
      className="group flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2 py-1"
    >
      <button type="submit" aria-label="Search the site" className="grid size-7 place-items-center text-muted-foreground hover:text-gold">
        <Search className="size-4" />
      </button>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => !query && setOpen(false)}
        placeholder="Search…"
        aria-label="Search query"
        className={
          "bg-transparent text-sm outline-none transition-all duration-300 " +
          (open ? "w-40 opacity-100 sm:w-52" : "w-0 opacity-0")
        }
      />
    </form>
  );
}
