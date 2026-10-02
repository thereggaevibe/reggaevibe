import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type React from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getNowPlaying, type NowPlaying } from "@/lib/radio.functions";

export const STREAM_URL = "https://server2.radiojar.com/qtv562rrs1duv";

type RadioContextValue = {
  playing: boolean;
  toggle: () => void;
  volume: number;
  setVolume: (v: number) => void;
  nowPlaying: NowPlaying | undefined;
  voteForTrack: (trackId: string) => Promise<void>;
  votedTrackIds: string[];
};

// Keep one context instance across hot-module reloads, otherwise a refreshed
// consumer reads a brand-new (empty) context and throws "must be used inside RadioProvider".
const globalStore = globalThis as typeof globalThis & {
  __radioContext?: React.Context<RadioContextValue | null>;
};
const RadioContext = (globalStore.__radioContext ??= createContext<RadioContextValue | null>(null));

export function RadioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [votedTrackIds, setVotedTrackIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: nowPlaying } = useQuery({
    queryKey: ["now-playing"],
    queryFn: () => getNowPlaying(),
    refetchInterval: 20_000,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.preload = "none";
    audio.crossOrigin = "anonymous";
    audio.volume = volume;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Anonymous listening heartbeat, one ping per minute while the stream plays.
  useEffect(() => {
    if (typeof window === "undefined" || !playing) return;
    let visitorId = window.localStorage.getItem("rvr-visitor-id");
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      window.localStorage.setItem("rvr-visitor-id", visitorId);
    }
    const ping = async () => {
      const { data } = await supabase.auth.getSession();
      await supabase.from("listener_pings").insert({
        visitor_id: visitorId as string,
        user_id: data.session?.user.id ?? null,
      });
    };
    void ping();
    const id = window.setInterval(() => void ping(), 60_000);
    return () => window.clearInterval(id);
  }, [playing]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      audio.src = "";
      setPlaying(false);
      return;
    }
    // Cache-bust so the listener always joins the live edge of the stream.
    audio.src = `${STREAM_URL}?nocache=${Date.now()}`;
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => {
        setPlaying(false);
        toast.error("The stream could not start. Please try again.");
      });
  }, [playing]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const voteForTrack = useCallback(
    async (trackId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        toast.error("Sign in to vote for the tunes you love.");
        return;
      }
      const { error } = await supabase.from("votes").insert({ track_id: trackId, user_id: userId });
      if (error) {
        if (error.code === "23505" || error.code === "23514" || error.message.includes("duplicate")) {
          toast.info("You already voted for this tune today.");
        } else if (error.message.toLowerCase().includes("rate limit")) {
          toast.error("Easy now — too many votes in one hour.");
        } else {
          toast.error("Vote could not be counted.");
        }
        return;
      }
      setVotedTrackIds((prev) => [...prev, trackId]);
      toast.success("Big up! Your vote is counted.");
      queryClient.invalidateQueries({ queryKey: ["chart"] });
      queryClient.invalidateQueries({ queryKey: ["my-votes"] });
    },
    [queryClient],
  );

  const value = useMemo(
    () => ({ playing, toggle, volume, setVolume, nowPlaying, voteForTrack, votedTrackIds }),
    [playing, toggle, volume, setVolume, nowPlaying, voteForTrack, votedTrackIds],
  );

  return <RadioContext.Provider value={value}>{children}</RadioContext.Provider>;
}

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be used inside RadioProvider");
  return ctx;
}
