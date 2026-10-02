import { Smartphone, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import apkAsset from "@/assets/reggaevibe-apk.asset.json";
import playBadge from "@/assets/google-play-badge.png";
import appMockupAsset from "@/assets/reggae-vibe-app.png.asset.json";

/** Android pre-release hero banner: sits above the first ad zone on the radio page. */
export function AndroidBetaBanner() {
  return (
    <section
      aria-label="Reggae Vibe Radio Android app early access"
      className="panel relative overflow-hidden rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-rasta-green/20 via-background to-rasta-red/20"
    >
      <div className="rasta-stripe absolute inset-x-0 top-0 h-1.5" />
      <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.3em] text-gold">
            <Smartphone className="size-4" aria-hidden="true" />
            Android Early Access · Pre-release
          </p>
          <h2 className="text-3xl font-black leading-tight md:text-4xl">
            Take the Vibe Everywhere —{" "}
            <span className="bg-gradient-to-r from-rasta-green via-gold to-rasta-red bg-clip-text text-transparent">
              Android Early Access is Live!
            </span>
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground md:text-base">
            Join the testing phase and stream Reggae Vibe Radio without
            interruption — full charts, voting and shows, right from your
            phone. Install the pre-release build directly on your Android
            device.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="font-extrabold uppercase tracking-wide">
              <a href={apkAsset.url} download="Reggaevibe-4.1.0.3.apk">
                <Download aria-hidden="true" />
                Join the Android Beta
              </a>
            </Button>
            <a
              href={apkAsset.url}
              download="Reggaevibe-4.1.0.3.apk"
              className="block transition-transform hover:scale-105 focus-visible:scale-105"
              aria-label="Get Reggae Vibe Radio for Android on Google Play (pre-release download)"
            >
              <img
                src={playBadge}
                alt="Get it on Google Play"
                width={192}
                height={155}
                className="h-14 w-auto drop-shadow-lg md:h-16"
              />
            </a>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Direct APK install · Sideloading required · v4.1.0.3
          </p>
        </div>
        <div className="relative mx-auto w-full max-w-[16rem] lg:max-w-[19rem]">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 scale-90 rounded-full bg-rasta-green/25 blur-3xl"
          />
          <img
            src={appMockupAsset.url}
            alt="Reggae Vibe Radio running on an Android phone"
            width={633}
            height={1203}
            className="size-full object-contain drop-shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}
