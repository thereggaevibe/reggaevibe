import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";


import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartTable } from "@/components/widgets/ChartTable";
import { Top5At5Chart } from "@/components/widgets/Top5At5Chart";

import { RadioShows } from "@/components/widgets/RadioShows";
import { WeeklyRecentlyPlayed } from "@/components/widgets/WeeklyRecentlyPlayed";
import { ShowsPreview } from "@/components/widgets/ShowsPreview";
import { FlyerSlider } from "@/components/widgets/FlyerSlider";
import { AndroidBetaBanner } from "@/components/widgets/AndroidBetaBanner";
import { CurrentShowFeature } from "@/components/widgets/CurrentShowFeature";
import { HeartVoteButton } from "@/components/ui/HeartVoteButton";
import { AdZoneRenderer } from "@/components/ads/AdZoneRenderer";
import { useRadio } from "@/components/player/radio-provider";
import { recentlyPlayedQuery } from "@/lib/station-queries";
import heroImage from "@/assets/hero-soundsystem.jpg";
import { stationLogoAsset } from "@/lib/site-images";
import { reggaeVibeBannerAsset as reggaeVibeBanner } from "@/lib/site-images";

const title = "Reggae Vibe Radio — Roots, Culture & Dancehall 24/7";
const description =
  "Stream Reggae Vibe Radio live, vote on the tunes playing now and follow the weekly Reggae and Dancehall charts, shows, DJs and events.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Home,
});

function Home() {
  const { playing, toggle, nowPlaying, voteForTrack, votedTrackIds } = useRadio();
  const { data: recent } = useQuery(recentlyPlayedQuery(7, 5));
  const artwork = recent?.slice(0, 3) ?? [];

  return (
    <>
      <section className="urban-hero relative overflow-hidden border-b border-border">
        <div
          aria-hidden="true"
          className="absolute inset-0 size-full opacity-20"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
          }}
        />
        <div className="relative mx-auto flex min-h-[660px] max-w-7xl flex-col gap-10 px-4 py-14 lg:py-20">
          <div className="relative z-10 w-full space-y-4">
            <img
              src={reggaeVibeBanner.url}
              alt="Reggae Vibe Radio logo"
              width={1920}
              height={640}
              className="w-full object-contain"
            />

            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <div className="relative aspect-square w-full max-w-[10rem] overflow-hidden rounded-xl border-2 border-background sm:max-w-[12rem]">
                <img
                  src={nowPlaying?.artwork ?? stationLogoAsset.url}
                  alt={nowPlaying?.title ? `${nowPlaying.title} artwork` : "Reggae Vibe Radio artwork"}
                  width={420}
                  height={420}
                  className="size-full object-cover"
                />
              </div>
              <div className="relative z-20 flex-1 text-center sm:text-left">
                <p className="max-w-3xl text-2xl font-black text-foreground md:text-3xl lg:text-4xl">
                  {nowPlaying?.title
                    ? `Now spinning: ${nowPlaying.title}${nowPlaying.artist ? ` by ${nowPlaying.artist}` : ""}.`
                    : "Tune in to the heaviest reggae and dancehall selection online."}{" "}
                  Vote on every tune and shape next week's charts.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start">
                  <Button size="lg" onClick={toggle}>
                    <Play /> {playing ? "Stop the stream" : "Listen live"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="relative grid grid-cols-3 gap-3 rounded-xl bg-background p-4 sm:gap-4 sm:p-6">
              {[0, 1, 2].map((index) => {
                const play = artwork[index];
                const track = play?.tracks;
                return (
                  <div key={play?.id ?? index} className="relative aspect-square overflow-hidden rounded-lg border-2 border-background">
                    <img src={track?.artwork_url ?? stationLogoAsset.url} alt={track ? `${track.title} artwork` : "Reggae Vibe Radio artwork"} width={420} height={420} className="size-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-background/85 p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-extrabold sm:text-sm">{track?.title ?? "Strictly positive"}</p>
                        <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{track?.artist || "Reggae Vibe Radio"}</p>
                      </div>
                      {track && (
                        <HeartVoteButton
                          voted={votedTrackIds.includes(track.id)}
                          label={`Vote for ${track.title}`}
                          onVote={() => voteForTrack(track.id)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>


      <div className="mx-auto max-w-7xl space-y-10 px-4 py-12">
        <AndroidBetaBanner />

        <AdZoneRenderer pageTarget="radio" positionKey="above_top5" />

        <Top5At5Chart />

        <div className="grid gap-6 xl:grid-cols-2">
          <ChartTable
            title="Dancehall Top 25"
            subtitle={`This month · ${new Date().getFullYear()} releases`}
            category="dancehall"
            limit={25}
            currentYearOnly
            window="month"
            scrollAfter={10}
          />
          <ChartTable
            title="Reggae Top 25"
            subtitle={`This month · ${new Date().getFullYear()} releases`}
            category="reggae"
            limit={25}
            currentYearOnly
            window="month"
            scrollAfter={10}
          />
        </div>

        <FlyerSlider area="all" label="Featured Events" eyebrow="Latest flyers" />

        <CurrentShowFeature />

        <AdZoneRenderer pageTarget="radio" positionKey="below_next_show" />

        <RadioShows />

        <AdZoneRenderer pageTarget="radio" positionKey="below_radio_shows" />

        <WeeklyRecentlyPlayed />

        <AdZoneRenderer pageTarget="radio" positionKey="below_recently_played" />

        <ShowsPreview />

        <AdZoneRenderer pageTarget="radio" positionKey="below_reggae_vibe_show" />
      </div>
    </>
  );
}
