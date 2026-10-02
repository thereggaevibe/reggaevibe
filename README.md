# ReggaeVibe

To provide the best prompt for Lovable.dev, I have synthesized your requirements into a structured, technical brief. You can copy and paste the block below directly into Lovable.

---

### Lovable.dev Prompt: Interactive Reggae Vibe Radio Platform

**Project Overview:**
Build a highly interactive, professional radio station website for "Reggae Vibe Radio." The site must feature a persistent, sticky audio player, real-time user engagement, a robust backend control room for station management, and dynamic charts based on user voting.

**Core Features & Technical Requirements:**

1. **Persistent Sticky Player & Stream:**
* **Source:** Integrate stream from `[https://server2.radiojar.com/qtv562rrs1duv](https://server2.radiojar.com/qtv562rrs1duv)`.
* **UI:** Sticky top-right player with a Rasta-colored spectrum visualizer, Play/Pause control, and scrolling song title/artist metadata.
* **Visuals:** Display track album art when available; fallback to the station logo when no image is detected.


2. **Interactive Voting & Analytics System:**
* **Voting:** Registered users can vote on the currently playing track.
* **Backend Database:** Track All-Time, Monthly, and Weekly votes per song.
* **Automated Charting:** Build front-end dynamic charts: "Top 5 Reggae Songs" (Weekly), "Dancehall Top 25" (Weekly), and "Reggae Top 25" (Weekly).
* **Categorization:** System should attempt to auto-categorize tracks (Reggae vs. Dancehall) via Radiojar tags; include a manual override in the Control Room to reassign tracks to correct charts.


3. **User Experience & Accounts:**
* **Authentication:** Social login (Google/Email) to minimize friction.
* **Security:** Implement rate-limiting/CAPTCHA to prevent bot attacks and fake account creation.
* **Data Access:** Logged-in users gain access to detailed analytics and historical track reports (what/when/frequency played).


4. **Content Management (Backend Control Room):**
* **Shoutouts:** Integrated button to send messages directly to `thereggaevibe@gmail.com`.
* **Recently Played:** A dedicated, user-friendly section showing track history for the last 7 days.
* **Scheduling:** Ability to create/edit daily and weekly station schedules. Automatically display "Current" and "Upcoming" programs on the front-end via widget.
* **Team/DJ Profiles:** Profile management for DJs/Hosts/Speakers (Photos, Bios, Roles, Social Links).
* **Events Manager:** Calendar system for special guests/shows. Include an animated countdown widget and automatic chronological sorting (upcoming events first).


5. **Design Reference & Layout:**
* **Header:** Sticky menu containing links for Radio, TV, and Magazine.
* **Style Reference:** Please analyze the layout, aesthetic, and functional hierarchy of this reference site: [https://demo.pro.radio/wp35/](https://www.google.com/search?q=https://demo.pro.radio/wp35/)



---

### Additional Advice for your build:

* **Regarding the reference link:** Since the demo site is WordPress-based, instruct Lovable to "replicate the UX, modular layout, and widget-based content hierarchy" of the reference, as Lovable will build a modern React/Tailwind application rather than a WordPress template.
* **Bot Prevention:** When you reach the integration phase, ask Lovable to add **Clerk** or **Supabase Auth** for account management, as these services have built-in security features that handle much of the bot prevention for you.
* **Radiojar Tags:** When testing the categorization, you may need to define a simple mapping table in your database where specific Radiojar strings (e.g., "Roots") are programmatically assigned to your "Reggae" chart.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rasta-groove-central.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8a8d7b57-e88f-495b-b867-00114755b735).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
