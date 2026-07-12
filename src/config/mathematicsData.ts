import { Calculator, ChartArea, ChartLine, ChartSpline, Crosshair, Dices, GitMerge, Layers3, Logs, Radical, Sigma, SquareFunction, Superscript, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface MathItem {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  href?: string;
  comingSoon?: boolean;
}

export const mathItems: MathItem[] = [
  {
    id: "simpleCalculator",
    label: "מחשבון פשוט",
    icon: Calculator,
    color: "bg-blue-500",
    href: "/mathematics/simple-calculator",
  },
  {
    id: "scientificCalculator",
    label: "מחשבון מדעי מקצועי",
    icon: SquareFunction,
    color: "bg-purple-500",
    href: "/mathematics/scientific-calculator",
  },
  {
    id: "powersAlgebra",
    label: "חזקות ומשוואות מעריכיות",
    icon: Superscript,
    color: "bg-emerald-500",
    href: "/mathematics/exponents-algebra",
  },
  {
    id: "logarithmicEquations",
    label: "משוואות לוגריתמיות",
    icon: Logs,
    color: "bg-teal-500",
    href: "/mathematics/logarithmic-equations",
  },
  {
    id: "derivatives",
    label: "גזירת פונקציות והצגה בגרף",
    icon: ChartLine,
    color: "bg-rose-500",
    href: "/mathematics/derivatives",
  },
  {
    id: "functionAnalysis",
    label: "חקירת פונקציות",
    icon: Crosshair,
    color: "bg-red-500",
    href: "/mathematics/function-analysis",
  },
  {
    id: "linearEquations",
    label: "משוואות לינאריות",
    icon: Sigma,
    color: "bg-orange-500",
    href: "/mathematics/linear-equations",
  },
  {
    id: "quadraticEquations",
    label: "משוואות ריבועיות",
    icon: Radical,
    color: "bg-indigo-500",
    href: "/mathematics/quadratic-equations",
  },
  {
    id: "systemOfEquations",
    label: "מערכת משוואות ב-2 נעלמים",
    icon: GitMerge,
    color: "bg-sky-500",
    href: "/mathematics/system-of-equations",
  },
  {
    id: "systemOf3Equations",
    label: "מערכת 3 משוואות ב-3 נעלמים",
    icon: Layers3,
    color: "bg-violet-600",
    href: "/mathematics/system-of-3-equations",
  },
  {
    id: "integralCalculator",
    label: "חישוב אינטגרלים",
    icon: ChartArea,
    color: "bg-fuchsia-500",
    href: "/mathematics/integrals",
  },
  {
    id: "arithmeticSequences",
    label: "סדרות חשבוניות",
    icon: TrendingUp,
    color: "bg-lime-600",
    href: "/mathematics/arithmetic-sequences",
  },
  {
    id: "geometricSequences",
    label: "סדרות הנדסיות",
    icon: ChartSpline,
    color: "bg-amber-500",
    href: "/mathematics/geometric-sequences",
  },
  {
    id: "probabilityStatistics",
    label: "הסתברות וסטטיסטיקה",
    icon: Dices,
    color: "bg-cyan-600",
    href: "/mathematics/probability-statistics",
  },
];
