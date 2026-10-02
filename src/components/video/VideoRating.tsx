import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { submitVideoRating, videoRatingQuery } from "@/lib/video-ratings-queries";

/**
 * Compact 1–5 star rating bar for a single video. Shows the live average and
 * vote count, and highlights the signed-in user's own rating once submitted.
 */
export function VideoRating({ videoId, className }: { videoId: string; className?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [hover, setHover] = useState(0);
  const { data } = useQuery(videoRatingQuery(videoId, user?.id ?? null));

  const rate = useMutation({
    mutationFn: (rating: number) => submitVideoRating(videoId, user!.id, rating),
    onSuccess: (_result, rating) => {
      toast.success(`Thanks — you rated this visual ${rating} star${rating === 1 ? "" : "s"}.`);
      queryClient.invalidateQueries({ queryKey: ["video-rating", videoId] });
      queryClient.invalidateQueries({ queryKey: ["video-rating-summary"] });
    },
    onError: () => toast.error("Could not save your rating. Try again."),
  });

  const average = data?.average ?? 0;
  const votes = data?.votes ?? 0;
  const mine = data?.mine ?? null;
  const shown = hover || mine || Math.round(average);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2",
        className,
      )}
    >
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)} role="group" aria-label="Rate this video">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!user || rate.isPending}
            onMouseEnter={() => setHover(star)}
            onFocus={() => setHover(star)}
            onBlur={() => setHover(0)}
            onClick={() => user && rate.mutate(star)}
            aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
            aria-pressed={mine === star}
            className="rounded-full p-0.5 transition-transform duration-150 hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed"
          >
            <Star
              className={cn(
                "size-5 transition-colors duration-150",
                star <= shown ? "fill-gold text-gold" : "text-muted-foreground",
              )}
            />
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {votes ? (
          <>
            <span className="font-bold text-foreground">{average.toFixed(1)}</span> / 5 · {votes} vote{votes === 1 ? "" : "s"}
          </>
        ) : (
          "No ratings yet"
        )}
      </p>

      {mine ? (
        <span className="rounded-full bg-rasta-green/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-rasta-green">
          You rated {mine}★
        </span>
      ) : !user ? (
        <Link to="/auth" className="text-xs font-bold uppercase tracking-widest text-gold no-underline hover:underline">
          Sign in to rate
        </Link>
      ) : null}
    </div>
  );
}
