type AdPackage = {
  id: string;
  name: string;
  priceCents: number;
  cadence: string;
  accent: string;
  radio: string;
  radioDetails: readonly { label: string; value: string }[];
  website: string;
  tv: string;
};

/** Three-month advertising packages sold as one-time PayPal payments. */
export const AD_PACKAGES = [
  {
    id: "package_green",
    name: "Green Package",
    priceCents: 50000,
    cadence: "3-Month Cycle",
    accent: "green",
    radio: "30-second commercial spot with six daily airings throughout the three-month campaign.",
    radioDetails: [
      { label: "Commercial Length", value: "30-second commercial spot" },
      { label: "Daily Frequency", value: "6 airings per day total (3 times during the day and 3 times at night)" },
    ],
    website: "Square Ad — front page sidebar and sidebar on all ad-featured subpages, no rotation.",
    tv: "15-second visual promo card during community video transitions and lower-third scroll spots.",
  },
  {
    id: "package_gold",
    name: "Gold Package",
    priceCents: 100000,
    cadence: "3-Month Cycle",
    accent: "gold",
    radio: "30-second commercial spot with 12 daily airings, including peak drive-time hours.",
    radioDetails: [
      { label: "Commercial Length", value: "30-second commercial spot" },
      { label: "Daily Frequency", value: "12 airings per day total (6 during day hours and 6 during night hours)" },
      { label: "Prime Placement", value: "Includes peak drive-time hours" },
    ],
    website: "XL Banner — front page bottom and bottom of all ad-featured subpages, no rotation.",
    tv: "30-second commercial spot during standard-rotation music video blocks and program breaks.",
  },
  {
    id: "package_red",
    name: "Red Package",
    priceCents: 150000,
    cadence: "3-Month Cycle",
    accent: "red",
    radio: "30-second commercial spot with 18 daily airings, plus a weekly featured sponsor mention.",
    radioDetails: [
      { label: "Commercial Length", value: "30-second commercial spot" },
      { label: "Daily Frequency", value: "18 airings per day total (9 during day hours and 9 during night hours)" },
      { label: "Exclusive Addition", value: "Includes a featured sponsor mention during a weekly show segment" },
    ],
    website: "XL Banner — front page top and top of all ad-featured subpages, no rotation.",
    tv: "60-second full commercial feature during prime broadcast slots and exclusive music video countdown placement.",
  },
] as const satisfies readonly AdPackage[];

export type AdPackageId = (typeof AD_PACKAGES)[number]["id"];

export function findAdPackage(id: string) {
  return AD_PACKAGES.find((p) => p.id === id);
}
