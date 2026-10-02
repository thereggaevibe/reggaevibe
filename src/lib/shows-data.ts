import { sundaySchoolAsset, morningRideAsset, pullItUpAsset, rootikalAsset } from "@/lib/site-images";

export type ShowItem = {
  id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  image_url: string | null;
  description?: string | null;
  djs?: { name: string | null } | null;
};

export const sourcedShows: ShowItem[] = [
  {
    id: "sun-school",
    title: "Sunday School",
    day_of_week: 1,
    start_time: "00:00",
    end_time: "02:00",
    image_url: sundaySchoolAsset.url,
    description: "Deep roots and spiritual selections to open the week with meditation music.",
    djs: { name: "Ras Mahddy" },
  },
  {
    id: "morning-ride",
    title: "The Morning Ride Show",
    day_of_week: 1,
    start_time: "06:00",
    end_time: "11:00",
    image_url: morningRideAsset.url,
    description: "Morning vibes, conscious talk and the freshest reggae to start your day right.",
    djs: { name: "Ras Mahddy & Ezinne" },
  },
  {
    id: "pull-monday",
    title: "Pull It Up Radio Show",
    day_of_week: 1,
    start_time: "18:00",
    end_time: "20:00",
    image_url: pullItUpAsset.url,
    description: "Foundation to modern roots with the man behind the controls, pulling up the heaviest tunes.",
    djs: { name: "Selecta Faya Gong" },
  },
  {
    id: "rootikal-sat",
    title: "Rootikal Radio Show",
    day_of_week: 6,
    start_time: "02:00",
    end_time: "04:00",
    image_url: rootikalAsset.url,
    description: "Strictly rootikal sounds, dubplates and steppers selections through the night.",
    djs: { name: "Selector TKZ" },
  },
  {
    id: "pull-sat",
    title: "Pull It Up Radio Show",
    day_of_week: 6,
    start_time: "19:00",
    end_time: "20:00",
    image_url: pullItUpAsset.url,
    description: "The weekend edition — brand new releases and exclusive interviews.",
    djs: { name: "Selecta Faya Gong" },
  },
  {
    id: "vibe-mix",
    title: "Reggae Vibe Mix Session",
    day_of_week: 5,
    start_time: "20:00",
    end_time: "23:00",
    image_url: rootikalAsset.url,
    description: "Three hours of non-stop mixing, dancehall juggling and classic riddim rewinds.",
    djs: { name: "Reggae Vibe Selectors" },
  },
];

export type ShowSlot = { day_of_week: number; start_time: string; end_time: string };

const byTime = (a: ShowSlot, b: ShowSlot) =>
  a.day_of_week === b.day_of_week ? a.start_time.localeCompare(b.start_time) : a.day_of_week - b.day_of_week;

export function showKey(show: { title: string; djs?: { name: string | null } | null }) {
  return `${show.title.trim().toLowerCase()}|${(show.djs?.name ?? "").trim().toLowerCase()}`;
}

/** All airtimes for each show, keyed by title + host, so a show is featured once. */
export function slotsByShow(shows: ShowItem[]): Map<string, ShowSlot[]> {
  const map = new Map<string, ShowSlot[]>();
  for (const show of shows) {
    const key = showKey(show);
    const list = map.get(key) ?? [];
    list.push({ day_of_week: show.day_of_week, start_time: show.start_time, end_time: show.end_time });
    map.set(key, list);
  }
  for (const list of map.values()) list.sort(byTime);
  return map;
}

/** One entry per show with every airtime attached. */
export function uniqueShows(shows: ShowItem[]): (ShowItem & { slots: ShowSlot[] })[] {
  const slots = slotsByShow(shows);
  const seen = new Set<string>();
  const out: (ShowItem & { slots: ShowSlot[] })[] = [];
  for (const show of shows) {
    const key = showKey(show);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...show, slots: slots.get(key) ?? [] });
  }
  return out.sort((a, b) => byTime(a.slots[0]!, b.slots[0]!));
}
