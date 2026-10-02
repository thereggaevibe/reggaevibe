import { createFileRoute } from "@tanstack/react-router";
import { Tv } from "lucide-react";

const title = "Reggae Vibe TV — Live Sessions & Video";
const description =
  "Reggae Vibe TV brings video sessions, interviews and event streams from the Reggae Vibe Radio studio.";

export const Route = createFileRoute("/tv")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: TvPage,
});

function TvPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center">
      <Tv className="mx-auto size-10 text-gold" />
      <h1 className="mt-5 text-4xl md:text-5xl">Reggae Vibe TV</h1>
      <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
        Video sessions, artist interviews and event broadcasts are coming to this channel. Add your stream or playlist
        links from the Control Room and they will appear here.
      </p>
    </div>
  );
}
