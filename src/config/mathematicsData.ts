import { Calculator, Sigma, SquareFunction } from "lucide-react";
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
    comingSoon: true,
  },
  {
    id: "scientificCalculator",
    label: "מחשבון מדעי מקצועי",
    icon: SquareFunction,
    color: "bg-purple-500",
    comingSoon: true,
  },
  {
    id: "linearEquations",
    label: "משוואות לינאריות",
    icon: Sigma,
    color: "bg-orange-500",
    href: "/mathematics/linear-equations",
  },
];
