import { useEffect, useState } from "react";
import { Facebook, Link2, Linkedin, MessageCircle, Send, Twitter } from "lucide-react";
import { toast } from "sonner";

/** Social share row for a single article. */
export function ShareLinks({ title, image, description }: { title: string; image?: string | undefined; description?: string | undefined }) {
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const targets = [
    { label: "Share on Facebook", Icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "Share on X", Icon: Twitter, href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { label: "Share on WhatsApp", Icon: MessageCircle, href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { label: "Share on Telegram", Icon: Send, href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
    { label: "Share on LinkedIn", Icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
  ];

  const pinterestHref = `https://pinterest.com/pin/create/button/?url=${encodedUrl}${
    image ? `&media=${encodeURIComponent(image)}` : ""
  }&description=${encodeURIComponent(description || title)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground">Share</span>
      {targets.map(({ label, Icon, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={label}
          className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-gold hover:text-gold"
        >
          <Icon className="size-4" />
        </a>
      ))}
      <button
        type="button"
        aria-label="Pin it on Pinterest"
        onClick={() => {
          window.open(pinterestHref, "pinterest-share", "width=760,height=600,noopener,noreferrer");
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-gold hover:text-gold"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.406.042-3.442.218-.936 1.405-5.957 1.405-5.957s-.359-.719-.359-1.78c0-1.667.967-2.913 2.17-2.913 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.567-.993 3.992-.283 1.194.599 2.168 1.777 2.168 2.132 0 3.771-2.249 3.771-5.494 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.74.098.119.112.223.083.343-.09.375-.291 1.187-.331 1.353-.052.22-.179.267-.412.161-1.543-.717-2.506-2.968-2.506-4.775 0-3.888 2.825-7.459 8.146-7.459 4.276 0 7.6 3.048 7.6 7.121 0 4.251-2.68 7.676-6.4 7.676-1.25 0-2.427-.649-2.829-1.415l-.769 2.933c-.279 1.073-1.033 2.417-1.538 3.236A12 12 0 1 0 12 0z" />
        </svg>
        Pin it
      </button>
      <button
        type="button"
        aria-label="Copy article link"
        onClick={() => {
          void navigator.clipboard.writeText(url).then(() => toast.success("Link copied"));
        }}
        className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-gold hover:text-gold"
      >
        <Link2 className="size-4" />
      </button>
    </div>
  );
}
