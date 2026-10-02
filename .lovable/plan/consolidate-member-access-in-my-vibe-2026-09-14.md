# Consolidate member access in My Vibe

## Changes
- Add a prominent member-access section at the top of My Vibe, with direct entry points for the Artist Dashboard and Add An Event.
- Keep the existing Artist Dashboard and Add An Event pages as the full working destinations, while moving their primary frontend access into My Vibe.
- Update existing public-page entry points so signed-in members are directed through My Vibe rather than separate dashboard links.
- Revise the advertising package details exactly as requested:
  - Green: keep the 30-second spot and daily-frequency details; remove the campaign-duration detail.
  - Gold: change to 12 daily airings, split 6 daytime and 6 nighttime; retain peak drive-time placement; remove campaign duration.
  - Red: change to a 30-second spot and 18 daily airings, split 9 daytime and 9 nighttime; retain the weekly sponsor mention; remove campaign duration.
- Preserve package prices, three-month billing cadence, website benefits, TV benefits, and PayPal checkout behavior.

## Technical details
- Use the existing My Vibe layout and design-system buttons/cards for the new access area.
- Preserve the existing authenticated routes for bookmarks and direct links; only consolidate the visible access points.
- Verify My Vibe, Music, Events, and Advertise on desktop and mobile, then confirm the preview build is healthy.
