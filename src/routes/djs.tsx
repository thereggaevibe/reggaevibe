import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Instagram, Link as LinkIcon } from "lucide-react";
import { djsQuery } from "@/lib/station-queries";
import { stationLogoAsset } from "@/lib/site-images";

const stationLogo = stationLogoAsset.url;

const title = "DJs, Hosts & Speakers — Reggae Vibe Radio";
const description =
  "Meet the Reggae Vibe Radio team: selectors, hosts and speakers behind the roots, culture and dancehall shows.";

export const Route = createFileRoute("/djs")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: DjsPage,
});

function DjsPage() {
  const { data, isLoading } = useQuery(djsQuery());

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-4xl md:text-5xl">The Team</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Selectors, hosts and speakers keeping the vibe running.</p>

      {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading profiles…</p>}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((dj) => {
          const socials = (dj.socials ?? {}) as Record<string, string>;
          return (
            <article key={dj.id} className="panel overflow-hidden">
              <img
                src={dj.photo_url ?? stationLogo}
                alt={dj.name}
                width={400}
                height={260}
                loading="lazy"
                className="h-48 w-full border-b border-border bg-surface-2 object-cover"
              />
              <div className="p-5">
                <h2 className="text-lg">{dj.name}</h2>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gold">{dj.role}</p>
                {dj.bio && <p className="mt-3 text-sm text-muted-foreground">{dj.bio}</p>}
                <div className="mt-4 flex gap-3">
                  {Object.entries(socials).map(([key, url]) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`${dj.name} on ${key}`}
                      className="text-muted-foreground transition-colors hover:text-gold"
                    >
                      {key === "instagram" ? <Instagram className="size-4" /> : <LinkIcon className="size-4" />}
                    </a>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
