"use client";

import { useState } from "react";
import { Shapes } from "lucide-react";
import {
  solveTriangleArea,
  solveQuadrilateralArea,
  solveRegularPolygonArea,
  type TriangleAreaMode,
  type QuadrilateralAreaMode,
  type AreaResult,
} from "@/lib/polygonArea";

type Category = "triangle" | "quadrilateral" | "regular";
type FormKey = "base" | "height" | "a" | "b" | "angle" | "base1" | "base2" | "d1" | "d2" | "side";

interface FieldDef {
  key: FormKey;
  label: string;
  hint: string;
}

const EMPTY_FORM: Record<FormKey, string> = {
  base: "",
  height: "",
  a: "",
  b: "",
  angle: "",
  base1: "",
  base2: "",
  d1: "",
  d2: "",
  side: "",
};

const TRIANGLE_TABS: { mode: TriangleAreaMode; label: string }[] = [
  { mode: "baseHeight", label: "בסיס וגובה" },
  { mode: "sas", label: "½ab·sin(C)" },
];

const QUAD_TABS: { mode: QuadrilateralAreaMode; label: string }[] = [
  { mode: "trapezoid", label: "טרפז" },
  { mode: "rhombus", label: "מעוין" },
  { mode: "parallelogram", label: "מקבילית" },
];

const REGULAR_OPTIONS: { n: number; label: string }[] = [
  { n: 3, label: "משולש שווה-צלעות" },
  { n: 4, label: "ריבוע" },
  { n: 5, label: "מחומש" },
  { n: 6, label: "משושה" },
  { n: 8, label: "תמניון" },
  { n: 10, label: "מעושר" },
  { n: 12, label: "תריסר" },
];

const TRIANGLE_FIELDS: Record<TriangleAreaMode, FieldDef[]> = {
  baseHeight: [
    { key: "base", label: "a", hint: "אורך הבסיס" },
    { key: "height", label: "h", hint: "הגובה לבסיס" },
  ],
  sas: [
    { key: "a", label: "a", hint: "צלע ראשונה" },
    { key: "b", label: "b", hint: "צלע שנייה" },
    { key: "angle", label: "C", hint: "הזווית הכלואה (מעלות)" },
  ],
};

const QUAD_FIELDS: Record<QuadrilateralAreaMode, FieldDef[]> = {
  trapezoid: [
    { key: "base1", label: "b₁", hint: "הבסיס הגדול" },
    { key: "base2", label: "b₂", hint: "הבסיס הקטן" },
    { key: "height", label: "h", hint: "הגובה" },
  ],
  rhombus: [
    { key: "d1", label: "d₁", hint: "אלכסון ראשון" },
    { key: "d2", label: "d₂", hint: "אלכסון שני" },
  ],
  parallelogram: [
    { key: "base", label: "a", hint: "אורך הצלע" },
    { key: "height", label: "h", hint: "הגובה לצלע" },
  ],
};

const REGULAR_FIELDS: FieldDef[] = [{ key: "side", label: "a", hint: "אורך הצלע" }];

interface Example {
  label: string;
  values: Partial<Record<FormKey, string>>;
  sides?: number;
}

const TRIANGLE_EXAMPLES: Record<TriangleAreaMode, Example[]> = {
  baseHeight: [{ label: "a=10, h=4", values: { base: "10", height: "4" } }],
  sas: [{ label: "a=6, b=6, C=60°", values: { a: "6", b: "6", angle: "60" } }],
};

const QUAD_EXAMPLES: Record<QuadrilateralAreaMode, Example[]> = {
  trapezoid: [{ label: "b₁=8, b₂=4, h=3", values: { base1: "8", base2: "4", height: "3" } }],
  rhombus: [{ label: "d₁=6, d₂=8", values: { d1: "6", d2: "8" } }],
  parallelogram: [{ label: "a=7, h=5", values: { base: "7", height: "5" } }],
};

const REGULAR_EXAMPLES: Example[] = [{ label: "a=4 (משושה)", values: { side: "4" }, sides: 6 }];

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

/* ------------------------------------------------------------------ */
/* Schematic diagrams                                                  */
/* ------------------------------------------------------------------ */

const SHAPE_STROKE = "#334155";
const AUX_STROKE = "#2F6FED";
const LABEL_FILL = "#ea580c";

function DiagramFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex justify-center rounded-xl border border-white/60 bg-white/50 py-3">
      <svg viewBox="0 0 220 160" width={200} height={145}>
        {children}
      </svg>
    </div>
  );
}

function TriangleBaseHeightDiagram() {
  return (
    <DiagramFrame>
      <polygon points="30,130 190,130 130,20" fill="#2F6FED22" stroke={SHAPE_STROKE} strokeWidth={2} />
      <line x1={130} y1={20} x2={130} y2={130} stroke={AUX_STROKE} strokeWidth={2} strokeDasharray="5 4" />
      <polyline points="122,130 122,122 130,122" fill="none" stroke={AUX_STROKE} strokeWidth={1.5} />
      <text x={110} y={148} fontSize={14} fontWeight={700} fill={LABEL_FILL} textAnchor="middle">a</text>
      <text x={144} y={78} fontSize={14} fontWeight={700} fill={AUX_STROKE} textAnchor="middle">h</text>
    </DiagramFrame>
  );
}

function TriangleSASDiagram() {
  return (
    <DiagramFrame>
      <polygon points="50,130 175,130 75,30" fill="#2F6FED22" stroke={SHAPE_STROKE} strokeWidth={2} />
      <path d="M 80 130 A 30 30 0 0 0 62 108" fill="none" stroke={LABEL_FILL} strokeWidth={1.5} />
      <text x={90} y={112} fontSize={13} fontWeight={700} fill={LABEL_FILL} textAnchor="middle">C</text>
      <text x={112} y={148} fontSize={14} fontWeight={700} fill={LABEL_FILL} textAnchor="middle">a</text>
      <text x={50} y={75} fontSize={14} fontWeight={700} fill={LABEL_FILL} textAnchor="middle">b</text>
    </DiagramFrame>
  );
}

function TrapezoidDiagram() {
  return (
    <DiagramFrame>
      <polygon points="30,130 190,130 150,30 70,30" fill="#2F6FED22" stroke={SHAPE_STROKE} strokeWidth={2} />
      <line x1={70} y1={30} x2={70} y2={130} stroke={AUX_STROKE} strokeWidth={2} strokeDasharray="5 4" />
      <polyline points="70,122 78,122 78,130" fill="none" stroke={AUX_STROKE} strokeWidth={1.5} />
      <text x={110} y={148} fontSize={14} fontWeight={700} fill={LABEL_FILL} textAnchor="middle">b₁</text>
      <text x={110} y={22} fontSize={14} fontWeight={700} fill={LABEL_FILL} textAnchor="middle">b₂</text>
      <text x={56} y={80} fontSize={14} fontWeight={700} fill={AUX_STROKE} textAnchor="middle">h</text>
    </DiagramFrame>
  );
}

function RhombusDiagram() {
  return (
    <DiagramFrame>
      <polygon points="110,20 190,80 110,140 30,80" fill="#2F6FED22" stroke={SHAPE_STROKE} strokeWidth={2} />
      <line x1={110} y1={20} x2={110} y2={140} stroke={AUX_STROKE} strokeWidth={2} strokeDasharray="5 4" />
      <line x1={30} y1={80} x2={190} y2={80} stroke={AUX_STROKE} strokeWidth={2} strokeDasharray="5 4" />
      <text x={122} y={55} fontSize={14} fontWeight={700} fill={AUX_STROKE} textAnchor="middle">d₁</text>
      <text x={110} y={72} fontSize={14} fontWeight={700} fill={AUX_STROKE} textAnchor="middle">d₂</text>
    </DiagramFrame>
  );
}

function ParallelogramDiagram() {
  return (
    <DiagramFrame>
      <polygon points="40,130 170,130 200,30 70,30" fill="#2F6FED22" stroke={SHAPE_STROKE} strokeWidth={2} />
      <line x1={70} y1={30} x2={70} y2={130} stroke={AUX_STROKE} strokeWidth={2} strokeDasharray="5 4" />
      <polyline points="70,122 78,122 78,130" fill="none" stroke={AUX_STROKE} strokeWidth={1.5} />
      <text x={105} y={148} fontSize={14} fontWeight={700} fill={LABEL_FILL} textAnchor="middle">a</text>
      <text x={56} y={80} fontSize={14} fontWeight={700} fill={AUX_STROKE} textAnchor="middle">h</text>
    </DiagramFrame>
  );
}

function regularPolygonPoints(n: number, cx: number, cy: number, r: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const theta = -Math.PI / 2 + (2 * Math.PI * i) / n;
    pts.push([cx + r * Math.cos(theta), cy + r * Math.sin(theta)]);
  }
  return pts;
}

function RegularPolygonDiagram({ sides }: { sides: number }) {
  const pts = regularPolygonPoints(sides, 110, 82, 62);
  const [x0, y0] = pts[0];
  const [x1, y1] = pts[1];
  const midX = (x0 + x1) / 2;
  const midY = (y0 + y1) / 2;
  const dx = midX - 110;
  const dy = midY - 82;
  const len = Math.hypot(dx, dy) || 1;
  const labelX = midX + (dx / len) * 14;
  const labelY = midY + (dy / len) * 14;
  return (
    <DiagramFrame>
      <polygon points={pts.map((p) => p.join(",")).join(" ")} fill="#2F6FED22" stroke={SHAPE_STROKE} strokeWidth={2} />
      <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={LABEL_FILL} strokeWidth={3} />
      <text x={labelX} y={labelY} fontSize={14} fontWeight={700} fill={LABEL_FILL} textAnchor="middle">a</text>
      <text x={110} y={86} fontSize={12} fontWeight={700} fill={SHAPE_STROKE} textAnchor="middle">{`n=${sides}`}</text>
    </DiagramFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Solver                                                               */
/* ------------------------------------------------------------------ */

export default function PolygonAreaSolver() {
  const [category, setCategory] = useState<Category>("triangle");
  const [triangleMode, setTriangleMode] = useState<TriangleAreaMode>("baseHeight");
  const [quadMode, setQuadMode] = useState<QuadrilateralAreaMode>("trapezoid");
  const [regularSides, setRegularSides] = useState(6);
  const [form, setForm] = useState<Record<FormKey, string>>(EMPTY_FORM);
  const [result, setResult] = useState<AreaResult | null>(null);

  const activeFields: FieldDef[] =
    category === "triangle" ? TRIANGLE_FIELDS[triangleMode] : category === "quadrilateral" ? QUAD_FIELDS[quadMode] : REGULAR_FIELDS;

  const examples: Example[] =
    category === "triangle" ? TRIANGLE_EXAMPLES[triangleMode] : category === "quadrilateral" ? QUAD_EXAMPLES[quadMode] : REGULAR_EXAMPLES;

  function computeResult(values: Partial<Record<FormKey, number>>): AreaResult {
    if (category === "triangle") return solveTriangleArea(triangleMode, values);
    if (category === "quadrilateral") return solveQuadrilateralArea(quadMode, values);
    return solveRegularPolygonArea({ sides: regularSides, side: values.side });
  }

  function parseActiveFields(source: Record<FormKey, string>): Partial<Record<FormKey, number>> | { error: string } {
    const values: Partial<Record<FormKey, number>> = {};
    for (const field of activeFields) {
      const raw = source[field.key].trim();
      if (raw === "") continue;
      const num = parseFloat(raw);
      if (!Number.isFinite(num)) return { error: `הערך של ${field.label} אינו מספר תקין` };
      values[field.key] = num;
    }
    return values;
  }

  function handleSolve() {
    const values = parseActiveFields(form);
    if ("error" in values) {
      setResult({ type: "error", message: values.error });
      return;
    }
    setResult(computeResult(values));
  }

  function handleExample(example: Example) {
    const next = { ...EMPTY_FORM, ...example.values };
    setForm(next);
    if (example.sides !== undefined) setRegularSides(example.sides);
    const values = parseActiveFields(next);
    if ("error" in values) return;
    setResult(
      category === "regular" && example.sides !== undefined
        ? solveRegularPolygonArea({ sides: example.sides, side: values.side })
        : computeResult(values),
    );
  }

  function handleCategoryChange(c: Category) {
    setCategory(c);
    setResult(null);
  }

  function handleTriangleModeChange(m: TriangleAreaMode) {
    setTriangleMode(m);
    setResult(null);
  }

  function handleQuadModeChange(m: QuadrilateralAreaMode) {
    setQuadMode(m);
    setResult(null);
  }

  function handleRegularSidesChange(n: number) {
    setRegularSides(n);
    setResult(null);
  }

  const formula =
    category === "triangle"
      ? triangleMode === "baseHeight"
        ? "S = ½ · a · h"
        : "S = ½ · a · b · sin(C)"
      : category === "quadrilateral"
        ? quadMode === "trapezoid"
          ? "S = ((b₁ + b₂) / 2) · h"
          : quadMode === "rhombus"
            ? "S = (d₁ · d₂) / 2"
            : "S = a · h"
        : "S = (n · a²) / (4 · tan(π/n))";

  const diagram =
    category === "triangle" ? (
      triangleMode === "baseHeight" ? (
        <TriangleBaseHeightDiagram />
      ) : (
        <TriangleSASDiagram />
      )
    ) : category === "quadrilateral" ? (
      quadMode === "trapezoid" ? (
        <TrapezoidDiagram />
      ) : quadMode === "rhombus" ? (
        <RhombusDiagram />
      ) : (
        <ParallelogramDiagram />
      )
    ) : (
      <RegularPolygonDiagram sides={regularSides} />
    );

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <div className="flex flex-row-reverse gap-2">
        {(
          [
            ["triangle", "משולש"],
            ["quadrilateral", "מרובעים"],
            ["regular", "מצולע משוכלל"],
          ] as [Category, string][]
        ).map(([c, label]) => (
          <button
            key={c}
            type="button"
            onClick={() => handleCategoryChange(c)}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
              category === c
                ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
                : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {category === "triangle" && (
        <div className="mt-2 flex flex-row-reverse gap-2">
          {TRIANGLE_TABS.map((tab) => (
            <button
              key={tab.mode}
              type="button"
              onClick={() => handleTriangleModeChange(tab.mode)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                triangleMode === tab.mode
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-white/60 bg-white/30 text-slate-600 hover:bg-white/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {category === "quadrilateral" && (
        <div className="mt-2 flex flex-row-reverse gap-2">
          {QUAD_TABS.map((tab) => (
            <button
              key={tab.mode}
              type="button"
              onClick={() => handleQuadModeChange(tab.mode)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                quadMode === tab.mode
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-white/60 bg-white/30 text-slate-600 hover:bg-white/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {category === "regular" && (
        <div className="mt-2 flex flex-row-reverse flex-wrap gap-2">
          {REGULAR_OPTIONS.map((opt) => (
            <button
              key={opt.n}
              type="button"
              onClick={() => handleRegularSidesChange(opt.n)}
              className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                regularSides === opt.n
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-white/60 bg-white/30 text-slate-600 hover:bg-white/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-center">
        <p dir="ltr" className="text-lg font-extrabold text-slate-800">
          {formula}
        </p>
      </div>

      {diagram}

      <div className="mt-4 grid grid-cols-3 gap-3">
        {activeFields.map((field) => (
          <div key={field.key}>
            <label htmlFor={`poly-${field.key}`} className="block text-right text-xs font-bold text-slate-600">
              <bdi dir="ltr">{field.label}</bdi> — {field.hint}
            </label>
            <input
              id={`poly-${field.key}`}
              type="text"
              dir="ltr"
              value={form[field.key]}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSolve();
              }}
              aria-label={field.hint}
              className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSolve}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        <Shapes className="size-5" strokeWidth={2} />
        חשב
      </button>

      <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
        {examples.map((example) => (
          <button
            key={example.label}
            type="button"
            dir="ltr"
            onClick={() => handleExample(example)}
            className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-white/70"
          >
            {example.label}
          </button>
        ))}
      </div>

      {result?.type === "error" && (
        <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
          <p className="text-sm font-bold">{result.message}</p>
        </div>
      )}

      {result?.type === "result" && (
        <>
          <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
            <p dir="ltr" className="text-xl font-extrabold leading-relaxed">
              S = {formatNumber(result.area)}
            </p>
          </div>

          {result.steps.length > 0 && (
            <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
              <p className="text-right text-sm font-extrabold text-black">דרך הפתרון:</p>
              <ol className="mt-2 space-y-2">
                {result.steps.map((step, stepIndex) => (
                  <li key={stepIndex} className="flex flex-row-reverse items-start gap-2">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2F6FED] text-xs font-bold text-white">
                      {stepIndex + 1}
                    </span>
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="text-right text-xs font-bold text-orange-500">{step.law}</span>
                      <span dir="ltr" className="text-right font-mono text-sm font-bold text-slate-700">
                        {step.expr}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  );
}
