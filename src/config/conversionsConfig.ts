import {
  Beaker,
  Clock,
  Database,
  Gauge,
  LandPlot,
  PlugZap,
  Ruler,
  Thermometer,
  Weight,
  Wind,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ConversionConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  path: string;
}

export const conversionsConfig: ConversionConfig[] = [
  {
    id: "length",
    label: "אורך",
    icon: Ruler,
    color: "bg-green-300",
    path: "/converter/length",
  },
  {
    id: "weight",
    label: "משקל",
    icon: Weight,
    color: "bg-orange-300",
    path: "/converter/weight",
  },
  {
    id: "volume",
    label: "נפח",
    icon: Beaker,
    color: "bg-teal-300",
    path: "/converter/volume",
  },
  {
    id: "temperature",
    label: "טמפרטורה",
    icon: Thermometer,
    color: "bg-red-400",
    path: "/converter/temperature",
  },
  {
    id: "speed",
    label: "מהירות",
    icon: Gauge,
    color: "bg-indigo-400",
    path: "/converter/speed",
  },
  {
    id: "time",
    label: "זמן",
    icon: Clock,
    color: "bg-amber-400",
    path: "/converter/time",
  },
  {
    id: "area",
    label: "שטח",
    icon: LandPlot,
    color: "bg-lime-400",
    path: "/converter/area",
  },
  {
    id: "energy",
    label: "אנרגיה",
    icon: Zap,
    color: "bg-yellow-400",
    path: "/converter/energy",
  },
  {
    id: "pressure",
    label: "לחץ",
    icon: Wind,
    color: "bg-sky-400",
    path: "/converter/pressure",
  },
  {
    id: "data",
    label: "נתונים",
    icon: Database,
    color: "bg-violet-400",
    path: "/converter/data",
  },
  {
    id: "power",
    label: "כוח",
    icon: PlugZap,
    color: "bg-rose-400",
    path: "/converter/power",
  },
];
