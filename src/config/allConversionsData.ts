import {
  Activity,
  Apple,
  ArrowUpDown,
  Beaker,
  BatteryCharging,
  Binary,
  BookOpen,
  Briefcase,
  Building,
  Building2,
  CalendarDays,
  CalendarRange,
  Car,
  CircleDot,
  Clock,
  Coins,
  Compass,
  CupSoda,
  Droplet,
  Droplets,
  Dumbbell,
  FileText,
  Flame,
  Fuel,
  Gauge,
  GlassWater,
  Globe,
  HandCoins,
  HardDrive,
  HeartPulse,
  History,
  Home,
  Image,
  KeyRound,
  Keyboard,
  LandPlot,
  LayoutGrid,
  Leaf,
  Lightbulb,
  Monitor,
  Package,
  Percent,
  PersonStanding,
  PlugZap,
  Printer,
  Radio,
  Receipt,
  Route,
  Ruler,
  Scale,
  Sun,
  Tag,
  Thermometer,
  Timer,
  TrendingUp,
  Type,
  Users,
  Utensils,
  Weight,
  Wifi,
  Wind,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ConversionUnit {
  id: string;
  label: string;
  toBase: (value: number) => number;
  fromBase: (value: number) => number;
}

export interface AllConversionItem {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  units: ConversionUnit[];
}

export interface AllConversionGroup {
  id: string;
  label: string;
  items: AllConversionItem[];
}

const linear = (id: string, label: string, factor: number): ConversionUnit => ({
  id,
  label,
  toBase: (v) => v * factor,
  fromBase: (v) => v / factor,
});

const custom = (
  id: string,
  label: string,
  toBase: (v: number) => number,
  fromBase: (v: number) => number,
): ConversionUnit => ({ id, label, toBase, fromBase });

const colorGlowMap: Record<string, string> = {
  "bg-blue-500": "#3b82f6",
  "bg-emerald-500": "#10b981",
  "bg-cyan-500": "#06b6d4",
  "bg-amber-500": "#f59e0b",
  "bg-rose-500": "#f43f5e",
  "bg-teal-500": "#14b8a6",
  "bg-indigo-500": "#6366f1",
  "bg-orange-500": "#f97316",
  "bg-sky-500": "#0ea5e9",
  "bg-yellow-500": "#eab308",
  "bg-red-500": "#ef4444",
  "bg-fuchsia-500": "#d946ef",
  "bg-lime-600": "#65a30d",
  "bg-purple-500": "#a855f7",
  "bg-violet-500": "#8b5cf6",
  "bg-green-600": "#16a34a",
  "bg-pink-500": "#ec4899",
  "bg-orange-600": "#ea580c",
  "bg-blue-600": "#2563eb",
  "bg-amber-600": "#d97706",
  "bg-rose-400": "#fb7185",
  "bg-teal-400": "#2dd4bf",
  "bg-stone-500": "#78716c",
  "bg-slate-600": "#475569",
  "bg-cyan-600": "#0891b2",
  "bg-indigo-600": "#4f46e5",
  "bg-purple-600": "#9333ea",
  "bg-orange-400": "#fb923c",
  "bg-emerald-600": "#059669",
  "bg-rose-600": "#e11d48",
  "bg-sky-600": "#0284c7",
  "bg-blue-400": "#60a5fa",
  "bg-teal-600": "#0d9488",
  "bg-lime-500": "#84cc16",
  "bg-green-500": "#22c55e",
  "bg-yellow-600": "#ca8a04",
  "bg-red-600": "#dc2626",
  "bg-violet-600": "#7c3aed",
  "bg-fuchsia-600": "#c026d3",
  "bg-pink-600": "#db2777",
  "bg-sky-400": "#38bdf8",
  "bg-slate-500": "#64748b",
};

export function glowColor(bgClass: string): string {
  return colorGlowMap[bgClass] ?? "#60a5fa";
}

export function formatConversionNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n !== 0 && (Math.abs(n) >= 1e9 || Math.abs(n) < 1e-6)) {
    return n.toExponential(3);
  }
  const rounded = Math.round(n * 1e6) / 1e6;
  return new Intl.NumberFormat("he-IL", { maximumFractionDigits: 6 }).format(
    rounded,
  );
}

export const allConversionsGroups: AllConversionGroup[] = [
  {
    id: "common",
    label: "נפוץ",
    items: [
      {
        id: "length",
        label: "אורך",
        icon: Ruler,
        color: "bg-blue-500",
        units: [
          linear("mm", "מ\"מ", 0.001),
          linear("cm", "ס\"מ", 0.01),
          linear("m", "מטר", 1),
          linear("km", "ק\"מ", 1000),
          linear("mi", "מייל", 1609.344),
        ],
      },
      {
        id: "weight",
        label: "משקל",
        icon: Weight,
        color: "bg-emerald-500",
        units: [
          linear("mg", "מ\"ג", 0.000001),
          linear("g", "גרם", 0.001),
          linear("kg", "ק\"ג", 1),
          linear("ton", "טון", 1000),
          linear("lb", "פאונד", 0.45359237),
        ],
      },
      {
        id: "volume",
        label: "נפח",
        icon: Beaker,
        color: "bg-cyan-500",
        units: [
          linear("ml", "מ\"ל", 0.001),
          linear("l", "ליטר", 1),
          linear("m3", "מ\"ק", 1000),
          linear("cup", "כוס", 0.24),
          linear("gal", "גלון", 3.785411784),
        ],
      },
      {
        id: "currency",
        label: "מטבע",
        icon: Coins,
        color: "bg-amber-500",
        units: [
          linear("ils", "₪", 1),
          linear("usd", "$", 3.7),
          linear("eur", "€", 4.0),
          linear("gbp", "£", 4.7),
          linear("jpy", "¥", 0.025),
        ],
      },
      {
        id: "temperature",
        label: "טמפרטורה",
        icon: Thermometer,
        color: "bg-rose-500",
        units: [
          custom(
            "c",
            "צלזיוס",
            (v) => v,
            (v) => v,
          ),
          custom(
            "f",
            "פרנהייט",
            (v) => ((v - 32) * 5) / 9,
            (v) => (v * 9) / 5 + 32,
          ),
          custom(
            "k",
            "קלווין",
            (v) => v - 273.15,
            (v) => v + 273.15,
          ),
        ],
      },
    ],
  },
  {
    id: "physical",
    label: "יחידות פיזיקליות",
    items: [
      {
        id: "area",
        label: "שטח",
        icon: LandPlot,
        color: "bg-teal-500",
        units: [
          linear("m2", "מ\"ר", 1),
          linear("dunam", "דונם", 1000),
          linear("hectare", "הקטר", 10000),
          linear("km2", "ק\"מ\"ר", 1000000),
          linear("acre", "אקר", 4046.8564224),
        ],
      },
      {
        id: "speed",
        label: "מהירות",
        icon: Gauge,
        color: "bg-indigo-500",
        units: [
          linear("kmh", "קמ\"ש", 1 / 3.6),
          linear("ms", "מטר/שנייה", 1),
          linear("mph", "מייל/שעה", 0.44704),
          linear("knot", "קשר", 0.514444),
        ],
      },
      {
        id: "time",
        label: "זמן",
        icon: Clock,
        color: "bg-orange-500",
        units: [
          linear("sec", "שנייה", 1),
          linear("min", "דקה", 60),
          linear("hour", "שעה", 3600),
          linear("day", "יום", 86400),
          linear("week", "שבוע", 604800),
        ],
      },
      {
        id: "pressure",
        label: "לחץ",
        icon: Wind,
        color: "bg-sky-500",
        units: [
          linear("pa", "פסקל", 1),
          linear("kpa", "קילופסקל", 1000),
          linear("bar", "בר", 100000),
          linear("atm", "אטמוספרה", 101325),
          linear("psi", "psi", 6894.757293168),
        ],
      },
      {
        id: "energy",
        label: "אנרגיה",
        icon: Zap,
        color: "bg-yellow-500",
        units: [
          linear("j", "ג'אול", 1),
          linear("kj", "קילוג'אול", 1000),
          linear("cal", "קלוריה", 4.184),
          linear("kcal", "קילוקלוריה", 4184),
          linear("kwh", "קוט\"ש", 3600000),
        ],
      },
    ],
  },
  {
    id: "scientific",
    label: "מדעי/הנדסי",
    items: [
      {
        id: "force",
        label: "כוח",
        icon: Dumbbell,
        color: "bg-red-500",
        units: [
          linear("n", "ניוטון", 1),
          linear("kn", "קילוניוטון", 1000),
          linear("dyn", "דיין", 0.00001),
          linear("kgf", "קילוגרם-כוח", 9.80665),
          linear("lbf", "פאונד-כוח", 4.4482216153),
        ],
      },
      {
        id: "power",
        label: "הספק",
        icon: PlugZap,
        color: "bg-fuchsia-500",
        units: [
          linear("w", "וואט", 1),
          linear("kw", "קילוואט", 1000),
          linear("hp", "כוח סוס", 745.6998715823),
          linear("btuh", "BTU/h", 0.29307107),
        ],
      },
      {
        id: "density",
        label: "צפיפות",
        icon: Package,
        color: "bg-lime-600",
        units: [
          linear("kgm3", "ק\"ג/מ\"ק", 1),
          linear("gcm3", "גרם/סמ\"ק", 1000),
          linear("kgl", "ק\"ג/ליטר", 1000),
          linear("lbft3", "פאונד/רגל מעוקב", 16.018463374),
        ],
      },
      {
        id: "frequency",
        label: "תדר",
        icon: Radio,
        color: "bg-purple-500",
        units: [
          linear("hz", "הרץ", 1),
          linear("khz", "קילוהרץ", 1000),
          linear("mhz", "מגהרץ", 1000000),
          linear("ghz", "גיגהרץ", 1000000000),
        ],
      },
      {
        id: "angle",
        label: "זווית",
        icon: Compass,
        color: "bg-violet-500",
        units: [
          linear("deg", "מעלות", 1),
          linear("rad", "רדיאנים", 180 / Math.PI),
          linear("grad", "גראד", 0.9),
          linear("turn", "סיבובים", 360),
        ],
      },
      {
        id: "baseConverter",
        label: "בסיסי מספרים",
        icon: Binary,
        color: "bg-slate-500",
        units: [
          custom(
            "decimal",
            "עשרוני (Decimal)",
            (v) => v,
            (v) => v,
          ),
          custom(
            "binary",
            "בינארי (Binary)",
            (v) => v,
            (v) => v,
          ),
        ],
      },
    ],
  },
  {
    id: "financial",
    label: "פיננסי",
    items: [
      {
        id: "percentage",
        label: "אחוזים",
        icon: Percent,
        color: "bg-green-600",
        units: [
          linear("percent", "אחוזים", 0.01),
          linear("permille", "פרומיל", 0.001),
          linear("decimal", "שבר עשרוני", 1),
        ],
      },
      {
        id: "discount",
        label: "הנחה",
        icon: Tag,
        color: "bg-pink-500",
        units: [
          linear("percentOff", "% הנחה", 0.01),
          custom(
            "amountSaved",
            "סכום שנחסך מ-100",
            (v) => v / 100,
            (v) => v * 100,
          ),
          custom(
            "finalPrice",
            "מחיר לאחר הנחה מ-100",
            (v) => (100 - v) / 100,
            (v) => 100 - v * 100,
          ),
        ],
      },
      {
        id: "tip",
        label: "טיפ",
        icon: HandCoins,
        color: "bg-orange-600",
        units: [
          linear("percentTip", "% טיפ", 0.01),
          custom(
            "tipAmount",
            "סכום טיפ על 100",
            (v) => v / 100,
            (v) => v * 100,
          ),
          custom(
            "totalWithTip",
            "סה\"כ לתשלום מ-100",
            (v) => (v - 100) / 100,
            (v) => 100 + v * 100,
          ),
        ],
      },
      {
        id: "vat",
        label: "מע\"מ",
        icon: Receipt,
        color: "bg-blue-600",
        units: [
          linear("percentVat", "% מע\"מ", 0.01),
          custom(
            "vatAmount",
            "סכום מע\"מ על 100",
            (v) => v / 100,
            (v) => v * 100,
          ),
          custom(
            "totalWithVat",
            "מחיר כולל מע\"מ מ-100",
            (v) => (v - 100) / 100,
            (v) => 100 + v * 100,
          ),
        ],
      },
      {
        id: "annualInterest",
        label: "ריבית שנתית",
        icon: TrendingUp,
        color: "bg-amber-600",
        units: [
          linear("annual", "% שנתי", 0.01),
          custom(
            "quarterly",
            "% רבעוני",
            (v) => (v * 4) / 100,
            (v) => (v * 100) / 4,
          ),
          custom(
            "monthly",
            "% חודשי",
            (v) => (v * 12) / 100,
            (v) => (v * 100) / 12,
          ),
          custom(
            "daily",
            "% יומי",
            (v) => (v * 365) / 100,
            (v) => (v * 100) / 365,
          ),
        ],
      },
    ],
  },
  {
    id: "cooking",
    label: "בישול ומטבח",
    items: [
      {
        id: "teaspoonTablespoon",
        label: "כפית↔כף",
        icon: Utensils,
        color: "bg-rose-400",
        units: [
          linear("tsp", "כפית", 5),
          linear("tbsp", "כף", 15),
          linear("ml", "מ\"ל", 1),
          linear("cup", "כוס", 240),
        ],
      },
      {
        id: "cupsMl",
        label: "כוסות↔מ\"ל",
        icon: CupSoda,
        color: "bg-teal-400",
        units: [
          linear("cup", "כוס", 240),
          linear("ml", "מ\"ל", 1),
          linear("l", "ליטר", 1000),
          linear("floz", "אונקיית נוזל", 29.5735),
        ],
      },
      {
        id: "gramOz",
        label: "גרם↔אונקיה",
        icon: Scale,
        color: "bg-stone-500",
        units: [
          linear("g", "גרם", 1),
          linear("kg", "ק\"ג", 1000),
          linear("oz", "אונקיה", 28.349523125),
          linear("lb", "פאונד", 453.59237),
        ],
      },
      {
        id: "ovenTemp",
        label: "מעלות תנור",
        icon: Flame,
        color: "bg-orange-500",
        units: [
          custom(
            "c",
            "צלזיוס",
            (v) => v,
            (v) => v,
          ),
          custom(
            "f",
            "פרנהייט",
            (v) => ((v - 32) * 5) / 9,
            (v) => (v * 9) / 5 + 32,
          ),
          custom(
            "gasMark",
            "גז מארק",
            (v) => (((v * 25 + 250) - 32) * 5) / 9,
            (v) => ((v * 9) / 5 + 32 - 250) / 25,
          ),
        ],
      },
      {
        id: "servings",
        label: "מספר מנות",
        icon: Users,
        color: "bg-sky-500",
        units: [
          linear("s2", "2 מנות", 1 / 2),
          linear("s4", "4 מנות", 1 / 4),
          linear("s6", "6 מנות", 1 / 6),
          linear("s8", "8 מנות", 1 / 8),
          linear("s12", "12 מנות", 1 / 12),
        ],
      },
    ],
  },
  {
    id: "digital",
    label: "דיגיטלי ומחשבים",
    items: [
      {
        id: "byteMegaGiga",
        label: "בייט↔מגה↔גיגה",
        icon: HardDrive,
        color: "bg-slate-600",
        units: [
          linear("byte", "בייט", 1),
          linear("kb", "קילובייט", 1024),
          linear("mb", "מגהבייט", 1024 ** 2),
          linear("gb", "גיגהבייט", 1024 ** 3),
          linear("tb", "טרהבייט", 1024 ** 4),
        ],
      },
      {
        id: "pixelCm",
        label: "פיקסל↔ס\"מ",
        icon: Image,
        color: "bg-cyan-600",
        units: [
          linear("px", "פיקסלים (96dpi)", 2.54 / 96),
          linear("cm", "ס\"מ", 1),
          linear("mm", "מ\"מ", 0.1),
          linear("in", "אינץ'", 2.54),
        ],
      },
      {
        id: "screenResolution",
        label: "רזולוציית מסך",
        icon: Monitor,
        color: "bg-indigo-600",
        units: [
          linear("px", "פיקסלים", 1),
          linear("kpx", "קילופיקסל", 1000),
          linear("mpx", "מגהפיקסל", 1000000),
          linear("gpx", "גיגהפיקסל", 1000000000),
        ],
      },
      {
        id: "internetSpeed",
        label: "מהירות אינטרנט",
        icon: Wifi,
        color: "bg-blue-500",
        units: [
          linear("bps", "סיביות/שנייה", 1),
          linear("kbps", "קילוסיביות/שנייה", 1000),
          linear("mbps", "מגהסיביות/שנייה", 1000000),
          linear("gbps", "גיגהסיביות/שנייה", 1000000000),
          linear("mBps", "מגהבייט/שנייה", 8000000),
        ],
      },
      {
        id: "loadTime",
        label: "זמן טעינה",
        icon: Timer,
        color: "bg-purple-600",
        units: [
          linear("ms", "מילישניות", 0.001),
          linear("sec", "שניות", 1),
          linear("min", "דקות", 60),
          linear("hour", "שעות", 3600),
        ],
      },
    ],
  },
  {
    id: "health",
    label: "בריאות וכושר",
    items: [
      {
        id: "foodEnergy",
        label: "קלוריות↔קילוג'אול",
        icon: Apple,
        color: "bg-orange-400",
        units: [
          linear("cal", "קלוריה", 4.184),
          linear("kcal", "קלוריית מזון (kcal)", 4184),
          linear("kj", "קילוג'אול", 1000),
          linear("j", "ג'אול", 1),
        ],
      },
      {
        id: "bodyWeight",
        label: "משקל גוף",
        icon: PersonStanding,
        color: "bg-emerald-600",
        units: [
          linear("kg", "ק\"ג", 1),
          linear("g", "גרם", 0.001),
          linear("lb", "פאונד", 0.45359237),
          linear("stone", "אבן (סטון)", 6.35029318),
        ],
      },
      {
        id: "heartRate",
        label: "קצב לב (% מהמקסימום)",
        icon: HeartPulse,
        color: "bg-red-500",
        units: [
          linear("percent", "אחוזים", 0.01),
          linear("decimal", "שבר עשרוני", 1),
          custom(
            "bpm200",
            "פעימות לדקה (ממקס' 200)",
            (v) => v / 200,
            (v) => v * 200,
          ),
          custom(
            "bpm180",
            "פעימות לדקה (ממקס' 180)",
            (v) => v / 180,
            (v) => v * 180,
          ),
        ],
      },
      {
        id: "bloodSugar",
        label: "סוכר בדם",
        icon: Droplet,
        color: "bg-rose-600",
        units: [
          custom(
            "mgdl",
            "מ\"ג/דצ\"ל",
            (v) => v / 18.0182,
            (v) => v * 18.0182,
          ),
          custom(
            "mmoll",
            "ממול/ליטר",
            (v) => v,
            (v) => v,
          ),
        ],
      },
      {
        id: "height",
        label: "גובה",
        icon: ArrowUpDown,
        color: "bg-sky-600",
        units: [
          linear("cm", "ס\"מ", 0.01),
          linear("m", "מטר", 1),
          linear("in", "אינץ'", 0.0254),
          linear("ft", "רגל", 0.3048),
        ],
      },
      {
        id: "bmi",
        label: "BMI (מדד מסת גוף)",
        icon: Activity,
        color: "bg-teal-500",
        units: [
          custom(
            "weight160",
            "משקל בק\"ג (גובה 160 ס\"מ)",
            (v) => v / 2.56,
            (v) => v * 2.56,
          ),
          custom(
            "weight170",
            "משקל בק\"ג (גובה 170 ס\"מ)",
            (v) => v / 2.89,
            (v) => v * 2.89,
          ),
          custom(
            "weight180",
            "משקל בק\"ג (גובה 180 ס\"מ)",
            (v) => v / 3.24,
            (v) => v * 3.24,
          ),
          custom(
            "bmi",
            "BMI",
            (v) => v,
            (v) => v,
          ),
        ],
      },
      {
        id: "waterIntake",
        label: "צריכת מים יומית",
        icon: GlassWater,
        color: "bg-blue-500",
        units: [
          linear("kg", "משקל גוף (ק\"ג)", 0.033),
          linear("liter", "ליטר ליום", 1),
          linear("cup", "כוסות מים (250 מ\"ל)", 0.25),
          linear("ml", "מ\"ל", 0.001),
        ],
      },
    ],
  },
  {
    id: "timeDates",
    label: "זמן ותאריכים",
    items: [
      {
        id: "timeZones",
        label: "אזורי זמן",
        icon: Globe,
        color: "bg-blue-400",
        units: [
          custom(
            "utc",
            "UTC",
            (v) => v,
            (v) => v,
          ),
          custom(
            "israel",
            "ישראל",
            (v) => v - 3,
            (v) => v + 3,
          ),
          custom(
            "london",
            "לונדון",
            (v) => v - 1,
            (v) => v + 1,
          ),
          custom(
            "newYork",
            "ניו יורק",
            (v) => v + 4,
            (v) => v - 4,
          ),
          custom(
            "tokyo",
            "טוקיו",
            (v) => v - 9,
            (v) => v + 9,
          ),
        ],
      },
      {
        id: "duration",
        label: "משך זמן",
        icon: CalendarDays,
        color: "bg-indigo-500",
        units: [
          linear("day", "יום", 1),
          linear("week", "שבוע", 7),
          linear("month", "חודש", 30.44),
          linear("year", "שנה", 365.25),
        ],
      },
      {
        id: "historicTime",
        label: "יחידות זמן היסטוריות",
        icon: History,
        color: "bg-amber-600",
        units: [
          linear("year", "שנה", 1),
          linear("decade", "עשור", 10),
          linear("century", "מאה", 100),
          linear("millennium", "אלף שנים", 1000),
        ],
      },
      {
        id: "fiscalPeriods",
        label: "תקופות פיסקליות",
        icon: CalendarRange,
        color: "bg-teal-600",
        units: [
          linear("month", "חודש", 1),
          linear("quarter", "רבעון", 3),
          linear("half", "חצי שנה", 6),
          linear("year", "שנה", 12),
        ],
      },
      {
        id: "workHours",
        label: "שעות עבודה",
        icon: Briefcase,
        color: "bg-slate-600",
        units: [
          linear("hour", "שעה", 1),
          linear("workday", "יום עבודה", 8),
          linear("workweek", "שבוע עבודה", 40),
          linear("workmonth", "חודש עבודה", 173.33),
        ],
      },
    ],
  },
  {
    id: "realEstate",
    label: "בנייה ונדל\"ן",
    items: [
      {
        id: "grossNetArea",
        label: "מ\"ר בניה (ברוטו/נטו)",
        icon: Building2,
        color: "bg-stone-500",
        units: [
          linear("net", "מ\"ר נטו", 1),
          custom(
            "gross",
            "מ\"ר ברוטו",
            (v) => v * 0.85,
            (v) => v / 0.85,
          ),
          linear("sqft", "רגל רבוע", 0.09290304),
        ],
      },
      {
        id: "buildingPercentage",
        label: "אחוזי בנייה",
        icon: LayoutGrid,
        color: "bg-lime-500",
        units: [
          linear("percent", "אחוז בנייה", 0.01),
          linear("decimal", "שבר עשרוני", 1),
          custom(
            "sqmPerDunam",
            "מ\"ר בנייה מתוך דונם",
            (v) => v / 1000,
            (v) => v * 1000,
          ),
        ],
      },
      {
        id: "pricePerSqm",
        label: "מחיר למ\"ר",
        icon: Home,
        color: "bg-green-500",
        units: [
          linear("perSqm", "מחיר למ\"ר (₪)", 1),
          custom(
            "per50",
            "עלות כוללת ל-50 מ\"ר",
            (v) => v / 50,
            (v) => v * 50,
          ),
          custom(
            "per100",
            "עלות כוללת ל-100 מ\"ר",
            (v) => v / 100,
            (v) => v * 100,
          ),
        ],
      },
      {
        id: "buildingHeight",
        label: "גובה בניין",
        icon: Building,
        color: "bg-orange-600",
        units: [
          linear("floor", "קומה", 3),
          linear("m", "מטר", 1),
          linear("ft", "רגל", 0.3048),
        ],
      },
      {
        id: "rent",
        label: "שכירות",
        icon: KeyRound,
        color: "bg-yellow-600",
        units: [
          linear("monthly", "שכירות חודשית", 1),
          linear("quarterly", "שכירות רבעונית", 1 / 3),
          linear("annual", "שכירות שנתית", 1 / 12),
        ],
      },
    ],
  },
  {
    id: "vehicles",
    label: "רכב ותחבורה",
    items: [
      {
        id: "fuelConsumption",
        label: "צריכת דלק",
        icon: Fuel,
        color: "bg-red-600",
        units: [
          custom(
            "l100km",
            "ליטר/100 ק\"מ",
            (v) => v,
            (v) => v,
          ),
          custom(
            "kml",
            "ק\"מ לליטר",
            (v) => 100 / v,
            (v) => 100 / v,
          ),
          custom(
            "mpgUs",
            "מייל לגלון (אמריקאי)",
            (v) => 235.214583 / v,
            (v) => 235.214583 / v,
          ),
          custom(
            "mpgUk",
            "מייל לגלון (אימפריאלי)",
            (v) => 282.480936 / v,
            (v) => 282.480936 / v,
          ),
        ],
      },
      {
        id: "travelTime",
        label: "זמן נסיעה לפי מהירות",
        icon: Route,
        color: "bg-sky-500",
        units: [
          custom(
            "kmh",
            "קמ\"ש",
            (v) => v,
            (v) => v,
          ),
          custom(
            "min100",
            "זמן ל-100 ק\"מ (דקות)",
            (v) => 6000 / v,
            (v) => 6000 / v,
          ),
          custom(
            "min10",
            "זמן ל-10 ק\"מ (דקות)",
            (v) => 600 / v,
            (v) => 600 / v,
          ),
        ],
      },
      {
        id: "travelCost",
        label: "עלות נסיעה",
        icon: Car,
        color: "bg-emerald-500",
        units: [
          linear("perKm", "עלות לק\"מ (₪)", 1),
          linear("per10km", "עלות ל-10 ק\"מ", 10),
          linear("per100km", "עלות ל-100 ק\"מ", 100),
        ],
      },
      {
        id: "tirePressure",
        label: "לחץ אוויר בצמיגים",
        icon: CircleDot,
        color: "bg-purple-500",
        units: [
          linear("psi", "psi", 6894.757293168),
          linear("bar", "בר", 100000),
          linear("kpa", "קילופסקל", 1000),
        ],
      },
      {
        id: "evEfficiency",
        label: "צריכת חשמל לרכב חשמלי",
        icon: BatteryCharging,
        color: "bg-cyan-500",
        units: [
          custom(
            "kwh100km",
            "קוט\"ש/100 ק\"מ",
            (v) => v,
            (v) => v,
          ),
          custom(
            "kmPerKwh",
            "ק\"מ לקוט\"ש",
            (v) => 100 / v,
            (v) => 100 / v,
          ),
          custom(
            "miPerKwh",
            "מייל לקוט\"ש",
            (v) => 62.137 / v,
            (v) => 62.137 / v,
          ),
        ],
      },
    ],
  },
  {
    id: "textContent",
    label: "טקסט ותוכן",
    items: [
      {
        id: "readingTime",
        label: "זמן קריאה משוער",
        icon: BookOpen,
        color: "bg-violet-600",
        units: [
          custom(
            "words200",
            "מילים (200 מילים/דקה)",
            (v) => v / 200,
            (v) => v * 200,
          ),
          custom(
            "words250",
            "מילים (250 מילים/דקה)",
            (v) => v / 250,
            (v) => v * 250,
          ),
          linear("minutes", "דקות קריאה", 1),
        ],
      },
      {
        id: "charsPages",
        label: "תווים↔עמודים",
        icon: FileText,
        color: "bg-blue-500",
        units: [
          linear("chars", "תווים", 1),
          linear("wordPage", "עמוד Word (~1800 תווים)", 1800),
          linear("bookPage", "עמוד ספר (~1500 תווים)", 1500),
        ],
      },
      {
        id: "printDpi",
        label: "DPI להדפסה",
        icon: Printer,
        color: "bg-fuchsia-600",
        units: [
          linear("px", "פיקסלים (300dpi)", 2.54 / 300),
          linear("cm", "ס\"מ", 1),
          linear("in", "אינץ'", 2.54),
        ],
      },
      {
        id: "typingSpeed",
        label: "מהירות הקלדה",
        icon: Keyboard,
        color: "bg-pink-600",
        units: [
          linear("wpm", "מילים לדקה (WPM)", 5),
          linear("charsPerMin", "תווים לדקה", 1),
          linear("charsPerSec", "תווים לשנייה", 60),
        ],
      },
      {
        id: "fontSize",
        label: "גודל גופן",
        icon: Type,
        color: "bg-indigo-600",
        units: [
          linear("pt", "נקודה (pt)", 1.3333333),
          linear("px", "פיקסל", 1),
          linear("mm", "מ\"מ", 3.7795),
        ],
      },
    ],
  },
  {
    id: "homeEnergy",
    label: "אנרגיה ביתית וסביבה",
    items: [
      {
        id: "electricityCost",
        label: "קוט\"ש↔עלות חשמל",
        icon: Lightbulb,
        color: "bg-yellow-500",
        units: [
          linear("kwh", "קוט\"ש", 0.6),
          linear("ils", "₪", 1),
          linear("agora", "אגורות", 0.01),
        ],
      },
      {
        id: "carbonFootprint",
        label: "טביעת רגל פחמנית",
        icon: Leaf,
        color: "bg-green-600",
        units: [
          linear("km", "ק\"מ נסיעה ברכב", 0.12),
          linear("kg", "ק\"ג CO2", 1),
          linear("ton", "טון CO2", 1000),
        ],
      },
      {
        id: "waterUsage",
        label: "צריכת מים",
        icon: Droplets,
        color: "bg-sky-400",
        units: [
          linear("liter", "ליטר מים", 0.008),
          linear("m3", "מ\"ק מים", 8),
          linear("ils", "₪", 1),
        ],
      },
      {
        id: "solarPanels",
        label: "פאנלים סולאריים",
        icon: Sun,
        color: "bg-amber-500",
        units: [
          linear("perDay", "קוט\"ש ליום", 1),
          linear("perYear", "קוט\"ש בשנה", 1 / 365),
          linear("installedKw", "קילוואט מותקן", 4.5),
        ],
      },
      {
        id: "gasUnits",
        label: "יחידות גז",
        icon: Flame,
        color: "bg-orange-500",
        units: [
          linear("m3", "מ\"ק גז", 10.55),
          linear("kwh", "קוט\"ש", 1),
          linear("ils", "₪", 1 / 0.21),
        ],
      },
    ],
  },
];

export const allConversionItemsFlat: AllConversionItem[] = allConversionsGroups.flatMap(
  (group) => group.items,
);

export function findConversionItemById(id: string): AllConversionItem | undefined {
  return allConversionItemsFlat.find((item) => item.id === id);
}
