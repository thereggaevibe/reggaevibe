import { Link } from "@tanstack/react-router";
import { Instagram, Linkedin, Mail, Phone, ShieldCheck, Twitch, Twitter, Youtube } from "lucide-react";
import { stationLogoAsset } from "@/lib/site-images";

const stationLogo = stationLogoAsset.url;

const SOCIALS = [
  { label: "YouTube", href: "https://www.youtube.com/user/thereggaevibe", Icon: Youtube },
  { label: "Twitter / X", href: "https://twitter.com/reggaevibe", Icon: Twitter },
  { label: "Instagram", href: "https://www.instagram.com/reggaevibe/", Icon: Instagram },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/reggaevibe/", Icon: Linkedin },
  { label: "Pinterest", href: "https://www.pinterest.es/reggaevibe", Icon: PinterestIcon },
  { label: "Spotify", href: "https://open.spotify.com/user/q4bjzfe32n57qaxucqb6nhj5y", Icon: SpotifyIcon },
  { label: "Twitch", href: "https://twitch.tv/reggaevibe", Icon: Twitch },
] as const;

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.65 19.31c-.1-.83-.19-2.1.04-3.01.2-.83 1.3-5.29 1.3-5.29s-.33-.67-.33-1.65c0-1.55.9-2.71 2.02-2.71.95 0 1.41.71 1.41 1.57 0 .95-.61 2.38-.92 3.7-.27 1.11.55 2.02 1.65 2.02 1.98 0 3.5-2.09 3.5-5.11 0-2.67-1.92-4.54-4.66-4.54-3.17 0-5.04 2.38-5.04 4.83 0 .96.37 1.99.83 2.55.09.11.1.21.08.32-.09.37-.3 1.18-.34 1.35-.05.22-.18.27-.41.16-1.53-.71-2.47-2.94-2.47-4.73 0-3.85 2.8-7.39 8.06-7.39 4.23 0 7.52 3.01 7.52 7.04 0 4.2-2.65 7.58-6.32 7.58-1.24 0-2.4-.64-2.8-1.4l-.76 2.91c-.28 1.06-1.02 2.39-1.52 3.2A10 10 0 1 0 12 2z" />
    </svg>
  );
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.59 14.44a.78.78 0 0 1-1.07.26c-2.93-1.79-6.62-2.2-10.97-1.2a.78.78 0 1 1-.35-1.52c4.73-1.08 8.82-.61 12.11 1.4.37.22.49.7.28 1.06zm1.22-2.72a.97.97 0 0 1-1.34.32c-3.35-2.06-8.46-2.66-12.42-1.45a.97.97 0 1 1-.57-1.86c4.53-1.37 10.16-.7 14.01 1.66a.97.97 0 0 1 .32 1.33zm.11-2.83c-4.02-2.39-10.65-2.61-14.48-1.44a1.17 1.17 0 1 1-.68-2.23C7.16 5.87 14.48 6.12 19.1 8.86a1.17 1.17 0 0 1-1.18 2.02z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="rasta-stripe h-1 w-full" />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <img src={stationLogo} alt="Reggae Vibe Radio logo" width={48} height={48} loading="lazy" className="size-12" />
            <span className="text-display text-xl">Reggae Vibe Radio</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Roots, culture and dancehall around the clock. Vote for the tunes you love and shape the weekly charts.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <a href="mailto:mail@thereggaevibe.com" className="inline-flex items-center gap-2 hover:text-foreground">
                <Mail className="size-4 text-gold" /> mail@thereggaevibe.com
              </a>
            </li>
            <li>
              <a href="tel:+12026708423" className="inline-flex items-center gap-2 hover:text-foreground">
                <Phone className="size-4 text-gold" /> 202-670-8423
              </a>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {SOCIALS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={label}
                title={label}
                className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-gold hover:text-gold"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm tracking-widest text-gold">Station</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Charts</Link></li>
            <li><Link to="/schedule" className="hover:text-foreground">Schedule</Link></li>
            <li><Link to="/djs" className="hover:text-foreground">Team &amp; DJs</Link></li>
            <li><Link to="/events" className="hover:text-foreground">Events</Link></li>
            <li><Link to="/membership" className="hover:text-foreground">VIP Membership</Link></li>
            <li><Link to="/advertise" className="hover:text-foreground">Advertise</Link></li>
            <li><Link to="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm tracking-widest text-gold">Listen</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Recently played</Link></li>

            <li><Link to="/tv" className="hover:text-foreground">Reggae Vibe TV</Link></li>
            <li><Link to="/magazine" className="hover:text-foreground">Magazine</Link></li>
            <li><a href="mailto:mail@thereggaevibe.com" className="hover:text-foreground">mail@thereggaevibe.com</a></li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-5 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
        <span>© {new Date().getFullYear()} Reggae Vibe Radio. One love.</span>
        <Link to="/privacy-policy" className="inline-flex items-center gap-2 hover:text-gold">
          <ShieldCheck className="size-3.5 text-gold" /> Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
