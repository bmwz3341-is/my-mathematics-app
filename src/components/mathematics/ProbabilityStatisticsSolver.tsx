"use client";

import { useState } from "react";
import { Dices } from "lucide-react";
import {
  formatNumber,
  formatPercent,
  solveBinomial,
  solveClassicalProbability,
  solveConditionalProbability,
  solveDescriptiveStats,
  solveNormalDistribution,
  type BinomialOutcome,
  type ClassicalProbabilityOutcome,
  type ConditionalProbabilityOutcome,
  type DescriptiveStatsOutcome,
  type FrequencyPair,
  type NormalDistributionOutcome,
  type NormalMode,
} from "@/lib/probabilityStatistics";
import NormalDistributionGraph from "@/components/mathematics/NormalDistributionGraph";

export type EngineId = "classical" | "conditional" | "binomial" | "descriptive" | "normal";

const ENGINES: { id: EngineId; label: string }[] = [
  { id: "classical", label: "הסתברות קלאסית" },
  { id: "conditional", label: "הסתברות מותנית ובייס" },
  { id: "binomial", label: "התפלגות בינומית" },
  { id: "descriptive", label: "סטטיסטיקה תיאורית" },
  { id: "normal", label: "התפלגות נורמלית" },
];

function StepsList({ steps }: { steps: { law: string; expr: string }[] }) {
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
              <span dir="ltr" className="text-right font-mono text-sm font-bold text-slate-700">
                {step.expr}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
      <p className="text-sm font-bold">{message}</p>
    </div>
  );
}

function ResultHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
      {children}
    </div>
  );
}

function SolveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
    >
      <Dices className="size-5" strokeWidth={2} />
      פתור
    </button>
  );
}

function NumField({
  id,
  label,
  value,
  onChange,
  onEnter,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-right text-xs font-bold text-slate-600">
        {label}
      </label>
      <input
        id={id}
        type="text"
        dir="ltr"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter();
        }}
        aria-label={label}
        className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ClassicalEngine() {
  const [favorable, setFavorable] = useState("");
  const [total, setTotal] = useState("");
  const [result, setResult] = useState<ClassicalProbabilityOutcome | null>(null);

  function handleSolve() {
    const f = parseFloat(favorable);
    const t = parseFloat(total);
    if (!Number.isFinite(f) || !Number.isFinite(t)) {
      setResult({ type: "error", message: "נא להזין ערכים מספריים בשני השדות" });
      return;
    }
    setResult(solveClassicalProbability(f, t));
  }

  return (
    <>
      <p className="text-right text-sm font-bold text-slate-600">
        חשבו את ההסתברות של מאורע בודד: P(A) = מספר התוצאות החיוביות למאורע A / מספר כל התוצאות האפשריות
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <NumField id="ps-favorable" label="מספר תוצאות חיוביות" value={favorable} onChange={setFavorable} onEnter={handleSolve} />
        <NumField id="ps-total" label="מספר תוצאות אפשריות" value={total} onChange={setTotal} onEnter={handleSolve} />
      </div>
      <SolveButton onClick={handleSolve} />

      {result?.type === "error" && <ErrorBox message={result.message} />}
      {result?.type === "result" && (
        <>
          <ResultHeader>
            <p className="text-sm font-bold">הסתברות המאורע</p>
            <p dir="ltr" className="mt-1 text-2xl font-extrabold">
              P(A) = {formatNumber(result.probability)} ({formatPercent(result.probability)})
            </p>
          </ResultHeader>
          <StepsList steps={result.steps} />
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function ConditionalEngine() {
  const [pAB, setPAB] = useState("");
  const [pAnotB, setPAnotB] = useState("");
  const [pnotAB, setPnotAB] = useState("");
  const [pnotAnotB, setPnotAnotB] = useState("");
  const [result, setResult] = useState<ConditionalProbabilityOutcome | null>(null);

  function handleSolve() {
    const vals = [pAB, pAnotB, pnotAB, pnotAnotB].map((v) => parseFloat(v));
    if (vals.some((v) => !Number.isFinite(v))) {
      setResult({ type: "error", message: "נא למלא את כל ארבעת תאי הטבלה בערכים מספריים" });
      return;
    }
    setResult(
      solveConditionalProbability({
        pAB: vals[0],
        pAnotB: vals[1],
        pnotAB: vals[2],
        pnotAnotB: vals[3],
      }),
    );
  }

  return (
    <>
      <p className="text-right text-sm font-bold text-slate-600">
        הזינו טבלת הסתברויות משותפת (Joint Probability) — סכום ארבעת התאים חייב להיות 1
      </p>

      <div dir="ltr" className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[280px] border-separate border-spacing-1 text-center">
          <thead>
            <tr>
              <th />
              <th className="text-xs font-bold text-slate-600">B</th>
              <th className="text-xs font-bold text-slate-600">B&apos;</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-xs font-bold text-slate-600">A</td>
              <td>
                <input
                  aria-label="P(A ∩ B)"
                  dir="ltr"
                  value={pAB}
                  onChange={(e) => setPAB(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSolve()}
                  className="w-full rounded-lg border border-white/60 bg-white/50 px-2 py-2 text-center font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
                />
              </td>
              <td>
                <input
                  aria-label="P(A ∩ B')"
                  dir="ltr"
                  value={pAnotB}
                  onChange={(e) => setPAnotB(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSolve()}
                  className="w-full rounded-lg border border-white/60 bg-white/50 px-2 py-2 text-center font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
                />
              </td>
            </tr>
            <tr>
              <td className="text-xs font-bold text-slate-600">A&apos;</td>
              <td>
                <input
                  aria-label="P(A' ∩ B)"
                  dir="ltr"
                  value={pnotAB}
                  onChange={(e) => setPnotAB(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSolve()}
                  className="w-full rounded-lg border border-white/60 bg-white/50 px-2 py-2 text-center font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
                />
              </td>
              <td>
                <input
                  aria-label="P(A' ∩ B')"
                  dir="ltr"
                  value={pnotAnotB}
                  onChange={(e) => setPnotAnotB(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSolve()}
                  className="w-full rounded-lg border border-white/60 bg-white/50 px-2 py-2 text-center font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <SolveButton onClick={handleSolve} />

      {result?.type === "error" && <ErrorBox message={result.message} />}
      {result?.type === "result" && (
        <>
          <ResultHeader>
            <p className="text-sm font-bold">הסתברות מותנית — נוסחת בייס</p>
            <p dir="ltr" className="mt-1 text-xl font-extrabold">
              P(A|B) = {formatNumber(result.pAGivenB)}
            </p>
            <p dir="ltr" className="mt-1 text-sm font-bold">
              P(B|A) = {formatNumber(result.pBGivenA)}
            </p>
            <p className="mt-2 text-xs font-bold">{result.independent ? "המאורעות בלתי תלויים" : "המאורעות תלויים"}</p>
          </ResultHeader>
          <StepsList steps={result.steps} />
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function BinomialEngine() {
  const [n, setN] = useState("");
  const [k, setK] = useState("");
  const [p, setP] = useState("");
  const [result, setResult] = useState<BinomialOutcome | null>(null);

  function handleSolve() {
    const nn = parseFloat(n);
    const kk = parseFloat(k);
    const pp = parseFloat(p);
    if (![nn, kk, pp].every((v) => Number.isFinite(v))) {
      setResult({ type: "error", message: "נא להזין ערכים מספריים בכל השדות (n, k, p)" });
      return;
    }
    setResult(solveBinomial(nn, kk, pp));
  }

  return (
    <>
      <p className="text-right text-sm font-bold text-slate-600">
        סדרת ניסויי ברנולי בלתי תלויים — הזינו n (מספר ניסויים), k (מספר הצלחות מבוקש) ו-p (הסתברות להצלחה בניסוי בודד)
      </p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <NumField id="ps-n" label="n" value={n} onChange={setN} onEnter={handleSolve} />
        <NumField id="ps-k" label="k" value={k} onChange={setK} onEnter={handleSolve} />
        <NumField id="ps-p" label="p" value={p} onChange={setP} onEnter={handleSolve} />
      </div>
      <SolveButton onClick={handleSolve} />

      {result?.type === "error" && <ErrorBox message={result.message} />}
      {result?.type === "result" && (
        <>
          <ResultHeader>
            <p className="text-sm font-bold">התפלגות בינומית</p>
            <p dir="ltr" className="mt-1 text-2xl font-extrabold">
              P(X = {formatNumber(result.k)}) = {formatNumber(result.probability)}
            </p>
            <p dir="ltr" className="mt-1 text-sm font-bold">
              ({formatPercent(result.probability)})
            </p>
          </ResultHeader>
          <StepsList steps={result.steps} />
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function DescriptiveEngine() {
  const [mode, setMode] = useState<"list" | "freq">("list");
  const [listText, setListText] = useState("");
  const [freqText, setFreqText] = useState("");
  const [result, setResult] = useState<DescriptiveStatsOutcome | null>(null);

  function handleSolve() {
    if (mode === "list") {
      const raw = listText.split(",").map((s) => s.trim()).filter((s) => s !== "");
      const values = raw.map((s) => parseFloat(s));
      if (values.length === 0 || values.some((v) => !Number.isFinite(v))) {
        setResult({ type: "error", message: "נא להזין רשימת מספרים מופרדים בפסיקים, לדוגמה: 4, 7, 7, 9, 12" });
        return;
      }
      setResult(solveDescriptiveStats({ mode: "list", values }));
    } else {
      const rows = freqText.split(",").map((s) => s.trim()).filter((s) => s !== "");
      const pairs: FrequencyPair[] = [];
      for (const row of rows) {
        const parts = row.split(":").map((s) => s.trim());
        if (parts.length !== 2) {
          setResult({ type: "error", message: "פורמט לא תקין — יש להזין 'ערך:שכיחות' מופרדים בפסיקים, לדוגמה: 4:2, 7:3, 9:1" });
          return;
        }
        const value = parseFloat(parts[0]);
        const freq = parseFloat(parts[1]);
        if (!Number.isFinite(value) || !Number.isFinite(freq)) {
          setResult({ type: "error", message: "פורמט לא תקין — יש להזין 'ערך:שכיחות' מופרדים בפסיקים, לדוגמה: 4:2, 7:3, 9:1" });
          return;
        }
        pairs.push({ value, freq });
      }
      if (pairs.length === 0) {
        setResult({ type: "error", message: "נא להזין לפחות שורה אחת בטבלת השכיחויות" });
        return;
      }
      setResult(solveDescriptiveStats({ mode: "freq", pairs }));
    }
  }

  return (
    <>
      <p className="text-right text-sm font-bold text-slate-600">
        חישוב ממוצע, חציון, שכיח וסטיית תקן — עבור רשימת נתונים גולמית או טבלת שכיחויות
      </p>

      <div className="mt-3 flex flex-row-reverse gap-2">
        <button
          type="button"
          onClick={() => setMode("list")}
          className={`rounded-full px-3 py-1 text-xs font-bold transition ${mode === "list" ? "bg-[#2F6FED] text-white" : "border border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"}`}
        >
          רשימת נתונים
        </button>
        <button
          type="button"
          onClick={() => setMode("freq")}
          className={`rounded-full px-3 py-1 text-xs font-bold transition ${mode === "freq" ? "bg-[#2F6FED] text-white" : "border border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"}`}
        >
          טבלת שכיחויות
        </button>
      </div>

      {mode === "list" ? (
        <div className="mt-3">
          <label htmlFor="ps-list" className="block text-right text-xs font-bold text-slate-600">
            רשימת נתונים (מופרדים בפסיקים)
          </label>
          <input
            id="ps-list"
            type="text"
            dir="ltr"
            value={listText}
            onChange={(e) => setListText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSolve()}
            placeholder="4, 7, 7, 9, 12"
            className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
          />
        </div>
      ) : (
        <div className="mt-3">
          <label htmlFor="ps-freq" className="block text-right text-xs font-bold text-slate-600">
            טבלת שכיחויות (ערך:שכיחות, מופרדים בפסיקים)
          </label>
          <input
            id="ps-freq"
            type="text"
            dir="ltr"
            value={freqText}
            onChange={(e) => setFreqText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSolve()}
            placeholder="4:2, 7:3, 9:1"
            className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
          />
        </div>
      )}

      <SolveButton onClick={handleSolve} />

      {result?.type === "error" && <ErrorBox message={result.message} />}
      {result?.type === "result" && (
        <>
          <ResultHeader>
            <p className="text-sm font-bold">סטטיסטיקה תיאורית (n = {formatNumber(result.n)})</p>
            <p dir="ltr" className="mt-2 text-sm font-bold leading-relaxed">
              x̄ = {formatNumber(result.mean)} | חציון = {formatNumber(result.median)} | שכיח ={" "}
              {result.modeValues.map(formatNumber).join(", ")}
            </p>
            <p dir="ltr" className="mt-1 text-sm font-bold leading-relaxed">
              σ² = {formatNumber(result.variance)} | σ = {formatNumber(result.stdev)}
            </p>
          </ResultHeader>
          <StepsList steps={result.steps} />
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

const NORMAL_MODES: { id: NormalMode; label: string }[] = [
  { id: "below", label: "P(X < x)" },
  { id: "above", label: "P(X > x)" },
  { id: "between", label: "P(a < X < b)" },
];

function NormalEngine() {
  const [mu, setMu] = useState("");
  const [sigma, setSigma] = useState("");
  const [mode, setMode] = useState<NormalMode>("below");
  const [x, setX] = useState("");
  const [x2, setX2] = useState("");
  const [result, setResult] = useState<NormalDistributionOutcome | null>(null);

  function handleSolve() {
    const muVal = parseFloat(mu);
    const sigmaVal = parseFloat(sigma);
    const xVal = parseFloat(x);
    if (![muVal, sigmaVal, xVal].every((v) => Number.isFinite(v))) {
      setResult({ type: "error", message: "נא להזין ערכים מספריים ל-μ, σ ו-X" });
      return;
    }
    let x2Val: number | undefined;
    if (mode === "between") {
      x2Val = parseFloat(x2);
      if (!Number.isFinite(x2Val)) {
        setResult({ type: "error", message: "נא להזין גם ערך X2 תקין עבור טווח בין שני ערכים" });
        return;
      }
    }
    setResult(solveNormalDistribution({ mu: muVal, sigma: sigmaVal, mode, x: xVal, x2: x2Val }));
  }

  return (
    <>
      <p className="text-right text-sm font-bold text-slate-600">
        מחשבון ציון תקן Z = (X - μ)/σ, וחישוב הסתברות מתחת/מעל/בין ערכים לפי ההתפלגות הנורמלית
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <NumField id="ps-mu" label="μ (ממוצע)" value={mu} onChange={setMu} onEnter={handleSolve} />
        <NumField id="ps-sigma" label="σ (סטיית תקן)" value={sigma} onChange={setSigma} onEnter={handleSolve} />
      </div>

      <div className="mt-3 flex flex-row-reverse flex-wrap gap-2">
        {NORMAL_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            dir="ltr"
            onClick={() => setMode(m.id)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${mode === m.id ? "bg-[#2F6FED] text-white" : "border border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <NumField id="ps-x" label={mode === "between" ? "X (גבול תחתון)" : "X"} value={x} onChange={setX} onEnter={handleSolve} />
        {mode === "between" && <NumField id="ps-x2" label="X2 (גבול עליון)" value={x2} onChange={setX2} onEnter={handleSolve} />}
      </div>

      <SolveButton onClick={handleSolve} />

      {result?.type === "error" && <ErrorBox message={result.message} />}
      {result?.type === "result" && (
        <>
          <ResultHeader>
            <p className="text-sm font-bold">התפלגות נורמלית</p>
            <p dir="ltr" className="mt-1 text-sm font-bold">
              Z = {formatNumber(result.z)}
              {result.z2 !== undefined && `, Z2 = ${formatNumber(result.z2)}`}
            </p>
            <p dir="ltr" className="mt-1 text-2xl font-extrabold">
              {formatNumber(result.probability)} ({formatPercent(result.probability)})
            </p>
          </ResultHeader>
          <StepsList steps={result.steps} />
          <NormalDistributionGraph mu={result.mu} sigma={result.sigma} mode={result.mode} x={result.x} x2={result.x2} />
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function ProbabilityStatisticsSolver({
  initialEngine = "classical",
}: {
  initialEngine?: EngineId;
}) {
  const [engine, setEngine] = useState<EngineId>(initialEngine);

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <div className="flex flex-row-reverse flex-wrap gap-2">
        {ENGINES.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setEngine(e.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${engine === e.id ? "bg-[#2F6FED] text-white shadow-[0_0_12px_rgba(47,111,237,0.5)]" : "border border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"}`}
          >
            {e.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {engine === "classical" && <ClassicalEngine />}
        {engine === "conditional" && <ConditionalEngine />}
        {engine === "binomial" && <BinomialEngine />}
        {engine === "descriptive" && <DescriptiveEngine />}
        {engine === "normal" && <NormalEngine />}
      </div>
    </div>
  );
}
