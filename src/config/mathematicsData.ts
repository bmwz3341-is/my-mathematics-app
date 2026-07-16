import { Calculator, ChartArea, ChartSpline, Crosshair, Dices, GitMerge, Layers3, Logs, Orbit, Radical, Sigma, SquareFunction, Superscript, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface MathItem {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  badge?: string;
  href?: string;
  comingSoon?: boolean;
}

export const mathItems: MathItem[] = [
  {
    id: "simpleCalculator",
    label: "מחשבון פשוט",
    icon: Calculator,
    color: "bg-blue-500",
    badge: "123",
    href: "/mathematics/simple-calculator",
  },
  {
    id: "scientificCalculator",
    label: "מחשבון מדעי",
    icon: SquareFunction,
    color: "bg-purple-500",
    badge: "sin",
    href: "/mathematics/scientific-calculator",
  },
  {
    id: "powersAlgebra",
    label: "חזקות ושורשים",
    icon: Superscript,
    color: "bg-emerald-500",
    badge: "xⁿ",
    href: "/mathematics/exponents-algebra",
  },
  {
    id: "logarithmicEquations",
    label: "לוגריתמים",
    icon: Logs,
    color: "bg-teal-500",
    badge: "log",
    href: "/mathematics/logarithmic-equations",
  },
  {
    id: "functionAnalysis",
    label: "חקירת פונקציות",
    icon: Crosshair,
    color: "bg-red-500",
    badge: "f(x)",
    href: "/mathematics/function-analysis",
  },
  {
    id: "linearEquations",
    label: "משוואות לינאריות",
    icon: Sigma,
    color: "bg-orange-500",
    badge: "y=x",
    href: "/mathematics/linear-equations",
  },
  {
    id: "quadraticEquations",
    label: "משוואות ריבועיות",
    icon: Radical,
    color: "bg-indigo-500",
    badge: "x²",
    href: "/mathematics/quadratic-equations",
  },
  {
    id: "systemOfEquations",
    label: "מערכת 2 נעלמים",
    icon: GitMerge,
    color: "bg-sky-500",
    badge: "x,y",
    href: "/mathematics/system-of-equations",
  },
  {
    id: "systemOf3Equations",
    label: "מערכת 3 נעלמים",
    icon: Layers3,
    color: "bg-violet-600",
    badge: "x,y,z",
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
  {
    id: "complexNumbers",
    label: "מספרים מרוכבים",
    icon: Orbit,
    color: "bg-violet-500",
    href: "/mathematics/complex-numbers",
  },
];
