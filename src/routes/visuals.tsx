import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, ListVideo, PlayCircle, Star, X, Youtube } from "lucide-react";

import { getPlaylistVisuals } from "@/lib/youtube.functions";
import { videoCategoriesQuery } from "@/lib/video-categories-queries";
import { videoRatingSummaryQuery, type RatingSummaryMap } from "@/lib/video-ratings-queries";
import { VideoRating } from "@/components/video/VideoRating";
import { AdZoneRenderer } from "@/components/ads/AdZoneRenderer";


type Visual = { id: string; title: string; url: string; thumbnail: string; views: string };

const PER_PAGE = 30;

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "views", label: "Most viewed" },
  { value: "title", label: "Title A–Z" },
  { value: "rating", label: "Top-rated videos" },
] as const;

/** Turns "1.4M views" into a sortable number. */
function viewsToNumber(views: string) {
  const match = views.match(/([\d.,]+)\s*([KMB])?/i);
  if (!match) return 0;
  const base = Number(match[1]!.replace(/,/g, "")) || 0;
  const suffix = (match[2] ?? "").toUpperCase();
  return base * (suffix === "B" ? 1e9 : suffix === "M" ? 1e6 : suffix === "K" ? 1e3 : 1);
}

const title = "Reggae Music Visuals — Reggae Vibe Media";
const description =
  "Watch the newest reggae and dancehall music visuals, interviews and Caribbean festival highlights from Reggae Vibe Media.";

export const Route = createFileRoute("/visuals")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VisualsPage,
});

function VisualsPage() {
  const fetchPlaylist = useServerFn(getPlaylistVisuals);
  const { data: categories } = useQuery(videoCategoriesQuery(true));

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [sort, setSort] = useState<string>("newest");
  const [active, setActive] = useState<Visual | null>(null);
  const [page, setPage] = useState(1);

  const activeCategory = useMemo(
    () => (categories ?? []).find((category) => category.slug === activeSlug) ?? (categories ?? [])[0] ?? null,
    [categories, activeSlug],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["playlist-visuals", activeCategory?.playlist_id],
    queryFn: () => fetchPlaylist({ data: { playlistId: activeCategory!.playlist_id, limit: 150 } }),
    enabled: !!activeCategory,
    staleTime: 600_000,
  });

  const videos = useMemo(() => (data ?? []) as Visual[], [data]);
  const videoIds = useMemo(() => videos.map((video) => video.id), [videos]);
  const { data: ratings } = useQuery(videoRatingSummaryQuery(videoIds));
  const ratingMap: RatingSummaryMap = ratings ?? {};

  const filtered = useMemo(() => {
    const list = videos.map((video) => ({ ...video, average_rating: ratingMap[video.id]?.average ?? 0, rating_votes: ratingMap[video.id]?.votes ?? 0 }));
    if (sort === "views") list.sort((a, b) => viewsToNumber(b.views) - viewsToNumber(a.views));
    if (sort === "title") list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "rating") list.sort((a, b) => b.average_rating - a.average_rating || b.rating_votes - a.rating_votes);
    return list;
  }, [videos, sort, ratings]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE),
    [filtered, currentPage],
  );

  useEffect(() => {
    setPage(1);
  }, [activeCategory?.id, sort]);


  return (
    <div className="min-h-screen bg-[#0f0f0f] text-foreground">
      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav
          aria-label="Video categories"
          className="h-max rounded-2xl border border-white/10 bg-[#212121] lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto"
        >
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-xl">Video categories</h2>
          </div>
          {!categories?.length ? (
            <p className="px-4 py-5 text-sm text-muted-foreground">No video categories yet.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {categories.map((category) => {
                const isActive = activeCategory?.id === category.id;
                return (
                  <li key={category.id}>
                    <button
                      type="button"
                      onClick={() => setActiveSlug(category.slug)}
                      aria-current={isActive ? "true" : undefined}
                      className={
                        "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide transition-colors hover:bg-white/5 " +
                        (isActive ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground")
                      }
                    >
                      <ListVideo className={"size-5 " + (isActive ? "text-rasta-red" : "text-gold")} />
                      {category.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>


        <div className="grid gap-8">
          <div className="w-full">
            <FeaturedSlider videos={filtered} onSelect={setActive} />
          </div>

          <AdZoneRenderer pageTarget="visuals" positionKey="above_visuals" />

          <section>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Youtube className="size-5 text-rasta-red" />
              <h2 className="text-2xl">{activeCategory?.name ?? "Reggae Music Visuals"}</h2>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">{filtered.length} videos</span>
              <label className="ml-auto flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                Sort
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  aria-label="Sort videos"
                  className="rounded-full border border-white/15 bg-[#212121] px-3 py-1.5 text-xs normal-case tracking-normal text-foreground outline-none"
                >
                  {SORTS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {isLoading && <p className="text-sm text-muted-foreground">Loading visuals…</p>}

            {!isLoading && !filtered.length && (
              <p className="text-sm text-muted-foreground">
                No videos matched
                {activeCategory && (
                  <>
                    {" "}—{" "}
                    <a
                      href={`https://www.youtube.com/playlist?list=${activeCategory.playlist_id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      browse the playlist on YouTube
                    </a>
                  </>
                )}
                .
              </p>
            )}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {paged.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => setActive(video)}
                  aria-label={`Play ${video.title}`}
                  className="group overflow-hidden rounded-xl border border-white/10 bg-[#212121] text-left transition-colors hover:border-rasta-red/60"
                >
                  <span className="relative block">
                    <img src={video.thumbnail} alt={`${video.title} thumbnail`} loading="lazy" className="aspect-video w-full object-cover" />
                    <PlayCircle className="absolute inset-0 m-auto size-10 text-white/0 transition-colors group-hover:text-rasta-red" />
                  </span>
                  <span className="block p-3">
                    <span className="line-clamp-2 block text-sm font-semibold">{video.title}</span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{video.views || "No view count"}</span>
                      <span className="flex items-center gap-1">
                        <Star className={"size-3.5 " + (video.rating_votes ? "fill-gold text-gold" : "text-muted-foreground")} />
                        {video.rating_votes ? `${video.average_rating.toFixed(1)} (${video.rating_votes})` : "Unrated"}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <nav aria-label="Video pages" className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="rounded-full border border-white/15 bg-[#212121] px-4 py-2 text-xs font-semibold uppercase tracking-widest disabled:opacity-40"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                  <button
                    key={number}
                    type="button"
                    onClick={() => setPage(number)}
                    aria-current={number === currentPage ? "page" : undefined}
                    className={
                      "size-9 rounded-full border text-sm font-semibold transition-colors " +
                      (number === currentPage
                        ? "border-rasta-red bg-rasta-red text-white"
                        : "border-white/15 bg-[#212121] text-muted-foreground hover:text-foreground")
                    }
                  >
                    {number}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-full border border-white/15 bg-[#212121] px-4 py-2 text-xs font-semibold uppercase tracking-widest disabled:opacity-40"
                >
                  Next
                </button>
              </nav>
            )}
          </section>
        </div>
      </div>

      {active && <Lightbox video={active} onClose={() => setActive(null)} />}
    </div>
  );
}

/** Auto-advancing single-video slider that pauses while hovered. */
function FeaturedSlider({ videos, onSelect }: { videos: Visual[]; onSelect: (video: Visual) => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = videos.length;

  useEffect(() => {
    setIndex(0);
  }, [total]);

  useEffect(() => {
    if (paused || total < 2) return;
    const timer = setTimeout(() => setIndex((current) => (current + 1) % total), 5000);
    return () => clearTimeout(timer);
  }, [index, paused, total]);

  if (!total) return null;
  const video = videos[index % total]!;

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#212121]"
    >
      <button type="button" onClick={() => onSelect(video)} aria-label={`Play ${video.title}`} className="block w-full text-left">
        <span className="relative block">
          <img src={video.thumbnail} alt={`${video.title} thumbnail`} className="aspect-video w-full object-cover" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <PlayCircle className="absolute inset-0 m-auto size-16 text-rasta-red drop-shadow" />
          <span className="absolute inset-x-0 bottom-0 p-5">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-rasta-red">Featured visual</span>
            <span className="mt-1 line-clamp-2 block max-w-2xl text-lg md:text-2xl">{video.title}</span>
            {video.views && <span className="mt-1 block text-xs text-muted-foreground">{video.views}</span>}
          </span>
        </span>
      </button>

      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIndex((current) => (current - 1 + total) % total)}
          aria-label="Previous video"
          className="grid size-9 place-items-center rounded-full bg-black/70 text-foreground hover:bg-rasta-red"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setIndex((current) => (current + 1) % total)}
          aria-label="Next video"
          className="grid size-9 place-items-center rounded-full bg-black/70 text-foreground hover:bg-rasta-red"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </section>
  );
}

/** Modal lightbox with autoplay embed, backdrop click and X to exit. */
function Lightbox({ video, onClose }: { video: Visual; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4"
    >
      <div onClick={(event) => event.stopPropagation()} className="relative w-full max-w-5xl">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="absolute -top-12 right-0 grid size-10 place-items-center rounded-full bg-rasta-red text-white shadow-lg hover:brightness-110"
        >
          <X className="size-6" />
        </button>
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/15 bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full"
          />
        </div>
        <p className="mt-3 text-sm font-semibold">{video.title}</p>
        {video.views && <p className="text-xs text-muted-foreground">{video.views}</p>}
        <VideoRating videoId={video.id} className="mt-3" />
      </div>
    </div>
  );
}
