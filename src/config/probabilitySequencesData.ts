import { ChartSpline, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface TrackCard {
  id: string;
  label: string;
  href: string;
  badge?: string;
  icon?: LucideIcon;
  color: string;
}

export const PROBABILITY_SEQUENCES_CARDS: TrackCard[] = [
  {
    id: "statistics",
    label: "סטטיסטיקה",
    href: "/mathematics/probability-statistics?engine=descriptive",
    badge: "x̄",
    color: "bg-purple-500",
  },
  {
    id: "normalDistribution",
    label: "התפלגות נורמלית",
    href: "/mathematics/probability-statistics?engine=normal",
    badge: "𝒩",
    color: "bg-indigo-600",
  },
  {
    id: "arithmeticSequences",
    label: "סדרות חשבוניות",
    href: "/mathematics/arithmetic-sequences",
    icon: TrendingUp,
    color: "bg-lime-600",
  },
  {
    id: "geometricSequences",
    label: "סדרות הנדסיות",
    href: "/mathematics/geometric-sequences",
    icon: ChartSpline,
    color: "bg-amber-500",
  },
];
