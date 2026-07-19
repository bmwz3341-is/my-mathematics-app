import { Activity, ChartColumn } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { mathItems } from "@/config/mathematicsData";
import { TRIGOGEO_CARDS } from "@/config/trigoGeoData";

export interface AppSearchItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  color: string;
  keywords?: string[];
}

// Extra search synonyms for items whose label alone won't match how people phrase a search.
const KEYWORDS: Record<string, string[]> = {
  quadraticEquations: ["פרבולה", "דיסקרימיננטה"],
  linearEquations: ["קו ישר", "שיפוע"],
  functionAnalysis: ["גרף", "נגזרת", "תחום הגדרה"],
  integralCalculator: ["שטח מתחת לגרף"],
  probabilityStatistics: ["ממוצע", "חציון", "שכיח", "סטיית תקן", "התפלגות נורמלית"],
  trigEquations: ["sin", "cos", "tan", "זווית"],
  trigLaws: ["משולש", "זווית"],
  triangleArea: ["שטח משולש", "מצולע"],
  complexNumbers: ["מרוכב", "i"],
};

const mathToolItems: AppSearchItem[] = mathItems
  .filter((item) => item.href && !item.comingSoon)
  .map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href!,
    icon: item.icon,
    color: item.color,
    keywords: KEYWORDS[item.id],
  }));

const trigoGeoItems: AppSearchItem[] = TRIGOGEO_CARDS.map((item) => ({
  id: item.id,
  label: item.label,
  href: item.href,
  icon: item.icon,
  color: "bg-sky-600",
  keywords: KEYWORDS[item.id],
}));

// Deep-links into the statistics engine that mathItems only exposes as one generic entry.
const probabilityEngineItems: AppSearchItem[] = [
  {
    id: "descriptiveStatistics",
    label: "סטטיסטיקה תיאורית",
    href: "/mathematics/probability-statistics?engine=descriptive",
    icon: ChartColumn,
    color: "bg-purple-500",
    keywords: ["ממוצע", "חציון", "שכיח", "סטיית תקן"],
  },
  {
    id: "normalDistribution",
    label: "התפלגות נורמלית",
    href: "/mathematics/probability-statistics?engine=normal",
    icon: Activity,
    color: "bg-indigo-600",
    keywords: ["גאוס", "z", "סטיית תקן"],
  },
];

export const appSearchItems: AppSearchItem[] = [
  ...mathToolItems,
  ...trigoGeoItems,
  ...probabilityEngineItems,
];
