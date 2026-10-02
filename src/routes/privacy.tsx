import { createFileRoute, redirect } from "@tanstack/react-router";

// The privacy policy now lives at /privacy-policy. This keeps older links,
// bookmarks and app screens pointing at /privacy working.
export const Route = createFileRoute("/privacy")({
  beforeLoad: () => {
    throw redirect({ to: "/privacy-policy", replace: true });
  },
});
