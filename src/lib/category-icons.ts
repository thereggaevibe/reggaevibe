import {
  Album,
  Award,
  Calendar,
  Camera,
  Disc3,
  Flame,
  Globe,
  Guitar,
  Headphones,
  Heart,
  Mic,
  Music,
  Newspaper,
  Radio,
  Sparkles,
  Star,
  Tag,
  Trophy,
  Tv,
  Users,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** The icon library offered in the Control Room icon picker. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Newspaper,
  Flame,
  Music,
  Mic,
  Radio,
  Disc3,
  Album,
  Headphones,
  Guitar,
  Video,
  Tv,
  Camera,
  Calendar,
  Users,
  Star,
  Trophy,
  Award,
  Heart,
  Sparkles,
  Zap,
  Globe,
  Tag,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

export function isCustomIcon(icon: string | null | undefined) {
  return !!icon && /^https?:\/\//i.test(icon);
}

export function resolveCategoryIcon(icon: string | null | undefined): LucideIcon {
  return (icon && CATEGORY_ICONS[icon]) || Newspaper;
}
