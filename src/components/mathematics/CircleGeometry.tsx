"use client";

import { useState } from "react";
import { Circle, Crosshair } from "lucide-react";
import { analyzeCircle, solveTangentLine, type CircleResult, type TangentResult } from "@/lib/circleGeometry";
import CircleDiagram from "@/components/mathematics/CircleDiagram";
import DailyChallengeBanner from "@/components/mathematics/DailyChallengeBanner";
import { useDailyChallengeAutoFill } from "@/lib/useDailyChallengeAutoFill";
import { useTrackExercise } from "@/hooks/useTrackExercise";

type Category = "explore" | "tangent";

const CATEGORIES: { id: Category; label: string; icon: typeof Circle }[] = [
  { id: "explore", label: "חקר מעגל", icon: Circle },
  { id: "tangent", label: "מציאת משיק", icon: Crosshair },
];

const EXPLORE_EXAMPLES = ["x^2+y^2-4x+6y-3=0", "(x-2)^2+(y+3)^2=16", "x^2+y^2-9=0", "x^2+(y-3)^2=25"];

const EXPLORE_LAWS = [
  { formula: "x²+y²+Ax+By+C=0", title: "צורה כללית של מעגל" },
  { formula: "(x-a)²+(y-b)²=R²", title: "צורה קנונית של מעגל" },
  { formula: "a=-A/2, b=-B/2, R²=a²+b²-C", title: "מעבר מכללית לקנונית" },
];

const TANGENT_EXAMPLES: { circle: string; point: string; label: string }[] = [
  { circle: "x^2+y^2-25=0", point: "3,4", label: "x²+y²=25 בנק' (3,4)" },
  { circle: "x^2+y^2-25=0", point: "0,5", label: "x²+y²=25 בנק' (0,5)" },
  { circle: "(x-2)^2+(y+3)^2=16", point: "2,1", label: "(x-2)²+(y+3)²=16 בנק' (2,1)" },
];

const TANGENT_LAWS = [
  { formula: "d=√((x₂-x₁)²+(y₂-y₁)²)", title: "נוסחת המרחק בין שתי נקודות" },
  { formula: "m₁·m₂=-1", title: "תנאי מאונכות של ישרים" },
  { formula: "y-y₀=m(x-x₀)", title: "משוואת ישר דרך נקודה עם שיפוע נתון" },
  { formula: "OP ⊥ משיק", title: "הרדיוס אל נקודת ההשקה מאונך למשיק" },
];

function StepsPanel({ steps }: { steps: { law: string; expr: string }[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
      <p className="text-right text-sm font-extrabold text-black">דרך הפתרון:</p>
      <ol className="mt-2 space-y-2">
        {steps.map((step, index) => (
          <li key={index} className="flex flex-row-reverse items-start gap-2">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2F6FED] text-xs font-bold text-white">
              {index + 1}
            </span>
            <span className="flex flex-col items-end gap-0.5">
              <span className="text-right text-xs font-bold text-orange-500">{step.law}</span>
              <span dir="ltr" className="font-mono text-base font-bold text-slate-700">
                {step.expr}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LawsBox({ title, laws }: { title: string; laws: { formula: string; title: string }[] }) {
  return (
    <div className="mt-5 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
      <p className="text-right text-sm font-extrabold text-black">{title}</p>
      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {laws.map((law) => (
          <div key={law.formula} className="flex items-center justify-between gap-2 rounded-lg bg-white/50 px-3 py-1.5">
            <span dir="ltr" className="font-mono text-sm font-bold text-[#2F6FED]">
              {law.formula}
            </span>
            <span className="text-xs font-bold text-slate-600">{law.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CircleGeometry() {
  const [category, setCategory] = useState<Category>("explore");

  // --- Tab 1: circle exploration (isolated state) ---
  const [circleInput, setCircleInput] = useState("");
  const [circleResult, setCircleResult] = useState<CircleResult | null>(null);

  // --- Tab 2: tangent line (isolated state) ---
  const [tanCircleInput, setTanCircleInput] = useState("");
  const [tanPointInput, setTanPointInput] = useState("");
  const [tangentResult, setTangentResult] = useState<TangentResult | null>(null);
  const track = useTrackExercise();

  function handleExploreSolve() {
    const r = analyzeCircle(circleInput);
    setCircleResult(r);
    if (r.type === "result") track("circleGeometry", circleInput);
  }
  function handleExploreExample(example: string) {
    setCircleInput(example);
    setCircleResult(analyzeCircle(example));
  }

  function handleTangentSolve() {
    const r = solveTangentLine(tanCircleInput, tanPointInput);
    setTangentResult(r);
    if (r.type === "result") track("circleGeometry", `${tanCircleInput} @ (${tanPointInput})`);
  }
  function handleTangentExample(example: (typeof TANGENT_EXAMPLES)[number]) {
    setTanCircleInput(example.circle);
    setTanPointInput(example.point);
    setTangentResult(solveTangentLine(example.circle, example.point));
  }

  const dailyChallengeActive = useDailyChallengeAutoFill("circleGeometry", (challenge) => {
    setCategory("explore");
    handleExploreExample(challenge.equation1 ?? "");
  });

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <div className="flex flex-row-reverse gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-bold transition sm:text-sm ${
              category === c.id
                ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
                : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
            }`}
          >
            <c.icon className="size-4" strokeWidth={2} />
            {c.label}
          </button>
        ))}
      </div>

      {/* ---------------- Explore circle ---------------- */}
      {category === "explore" && (
        <>
          <label htmlFor="circle-input" className="mt-4 block text-right text-sm font-bold text-slate-600">
            הזינו משוואת מעגל בצורה כללית (x²+y²+Ax+By+C=0) או קנונית ((x-a)²+(y-b)²=R²)
          </label>
          <DailyChallengeBanner active={dailyChallengeActive} />
          <input
            id="circle-input"
            type="text"
            dir="ltr"
            value={circleInput}
            onChange={(e) => setCircleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleExploreSolve();
            }}
            placeholder="x^2+y^2-4x+6y-3=0"
            aria-label="משוואת מעגל"
            className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
          />

          <button
            type="button"
            onClick={handleExploreSolve}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
          >
            <Circle className="size-5" strokeWidth={2} />
            נתח מעגל
          </button>

          <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
            {EXPLORE_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                dir="ltr"
                onClick={() => handleExploreExample(example)}
                className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-white/70"
              >
                {example}
              </button>
            ))}
          </div>

          {circleResult?.type === "error" && (
            <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
              <p className="text-sm font-bold">{circleResult.message}</p>
            </div>
          )}

          {circleResult?.type === "result" && (
            <>
              <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
                <p className="text-xl font-extrabold leading-relaxed">
                  מרכז{" "}
                  <bdi dir="ltr">
                    ({circleResult.circle.centerX.toLocaleString("en-US", { maximumFractionDigits: 4 })},{" "}
                    {circleResult.circle.centerY.toLocaleString("en-US", { maximumFractionDigits: 4 })})
                  </bdi>
                </p>
                <p dir="ltr" className="mt-1 text-xl font-extrabold leading-relaxed">
                  R = {circleResult.circle.radius.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                </p>
                <p dir="ltr" className="mt-2 text-sm font-bold text-white/90">
                  {circleResult.canonicalExpr}
                </p>
              </div>

              <StepsPanel steps={circleResult.steps} />

              <CircleDiagram
                centerX={circleResult.circle.centerX}
                centerY={circleResult.circle.centerY}
                radius={circleResult.circle.radius}
              />
            </>
          )}

          <LawsBox title="חוקי גיאומטריה אנליטית — מעגל" laws={EXPLORE_LAWS} />
        </>
      )}

      {/* ---------------- Find tangent ---------------- */}
      {category === "tangent" && (
        <>
          <div className="mt-4">
            <label htmlFor="tan-circle-input" className="block text-right text-sm font-bold text-slate-600">
              משוואת המעגל
            </label>
            <input
              id="tan-circle-input"
              type="text"
              dir="ltr"
              value={tanCircleInput}
              onChange={(e) => setTanCircleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTangentSolve();
              }}
              placeholder="x^2+y^2-25=0"
              aria-label="משוואת המעגל"
              className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
            />
          </div>

          <div className="mt-3">
            <label htmlFor="tan-point-input" className="block text-right text-sm font-bold text-slate-600">
              <bdi dir="ltr">P(x₀,y₀)</bdi> — נקודת ההשקה (חייבת להיות על המעגל)
            </label>
            <input
              id="tan-point-input"
              type="text"
              dir="ltr"
              value={tanPointInput}
              onChange={(e) => setTanPointInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTangentSolve();
              }}
              placeholder="3,4"
              aria-label="נקודת ההשקה"
              className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleTangentSolve}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
          >
            <Crosshair className="size-5" strokeWidth={2} />
            מצא משיק
          </button>

          <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
            {TANGENT_EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                dir="ltr"
                onClick={() => handleTangentExample(example)}
                className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-white/70"
              >
                {example.label}
              </button>
            ))}
          </div>

          {tangentResult?.type === "error" && (
            <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
              <p className="text-sm font-bold">{tangentResult.message}</p>
            </div>
          )}

          {tangentResult?.type === "result" && (
            <>
              <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
                <p dir="ltr" className="text-2xl font-extrabold">
                  {tangentResult.tangentExpr}
                </p>
              </div>

              <StepsPanel steps={tangentResult.steps} />

              <CircleDiagram
                centerX={tangentResult.circle.centerX}
                centerY={tangentResult.circle.centerY}
                radius={tangentResult.circle.radius}
                point={tangentResult.point}
                tangentSlope={tangentResult.slope}
              />
            </>
          )}

          <LawsBox title="חוקי גיאומטריה אנליטית — ישרים ומשיקים" laws={TANGENT_LAWS} />
        </>
      )}
    </div>
  );
}
