"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, RotateCcw, X, XCircle } from "lucide-react";
import type { Exam } from "@/lib/exams";
import { checkAnswer, type CheckResult } from "@/lib/examChecker";
import { useExamProgress } from "@/hooks/useExamProgress";
import { useTrackExercise } from "@/hooks/useTrackExercise";
import { mathItems } from "@/config/mathematicsData";

/** Per-subject guidance on what format to type — without this the input field is ambiguous
 * (e.g. is "x^2-5x+6=0" answered with "2,3", "x=2,3", or something else?). */
const ANSWER_HINTS: Record<string, string> = {
  linearEquations: "הזינו מספר, למשל 5",
  quadraticEquations: "הזינו את הפתרונות מופרדים בפסיק, למשל 2, 3",
  powersAlgebra: "הזינו את הביטוי המפושט, למשל x^5",
  logarithmicEquations: "הזינו את ערך x, למשל 4",
  functionAnalysis: "הזינו את הנגזרת, למשל 3x^2 - 6x",
  circleGeometry: "הזינו מרכז ורדיוס מופרדים בפסיק, למשל 2, -3, 4",
  systemOfEquations: "הזינו x ו-y מופרדים בפסיק, למשל 2, 3",
  systemOf3Equations: "הזינו x, y ו-z מופרדים בפסיק, למשל 1, 2, 3",
};

/** Per-question-mode hint, takes priority over ANSWER_HINTS[subject] when set. */
const MODE_HINTS: Record<string, string> = {
  extrema: "הזינו את נקודות הקיצון (x, y) מופרדות בפסיק, למשל -1, 4, 3, -20",
};

/** "eq1 | eq2 | eq3" -> one line per equation, for systems of equations. */
function ExpressionDisplay({ expression }: { expression: string }) {
  const parts = expression.split("|").map((s) => s.trim());
  if (parts.length === 1) {
    return (
      <p dir="ltr" className="font-mono text-xl font-extrabold text-slate-800">
        {expression}
      </p>
    );
  }
  return (
    <div className="space-y-1">
      {parts.map((part, i) => (
        <p key={i} dir="ltr" className="font-mono text-lg font-extrabold text-slate-800">
          {part}
        </p>
      ))}
    </div>
  );
}

function StepsPanel({ steps }: { steps: CheckResult["steps"] }) {
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
            <span className="flex min-w-0 flex-col items-end gap-0.5">
              <span className="text-right text-xs font-bold text-orange-500">{step.label}</span>
              <span dir="ltr" className="max-w-full break-words font-mono text-sm font-bold text-slate-700">
                {step.expr}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Runs one exam question-by-question, checking each answer via the same
 * (unmodified) solver functions used elsewhere in the app — see
 * `examChecker.ts`, which also returns that solver's own step-by-step
 * explanation (no graphs — this only ever renders text). Progress (current
 * question, per-question answers, last score) is persisted to localStorage
 * via `useExamProgress`, so leaving mid-exam and coming back resumes at the
 * same question.
 */
export default function ExamRunner({ exam }: { exam: Exam }) {
  const { progress, update, reset } = useExamProgress(exam.id);
  const [userInput, setUserInput] = useState("");
  const [checked, setChecked] = useState<CheckResult | null>(null);
  const track = useTrackExercise();
  const router = useRouter();

  const subjectTool = mathItems.find((item) => item.id === exam.subject);
  const totalQuestions = exam.questions.length;
  const index = Math.min(progress.currentQuestionIndex, totalQuestions);
  const question = exam.questions[index];

  function handleCheck() {
    if (!question || checked) return;
    const result = checkAnswer(exam.subject, question.expression, userInput, question.expectedAnswer, question.mode);
    setChecked(result);
    update({
      ...progress,
      answers: { ...progress.answers, [question.id]: { userAnswer: userInput, isCorrect: result.isCorrect } },
    });
    if (result.isCorrect) track(exam.subject, question.expression);
  }

  function handleNext() {
    const nextIndex = index + 1;
    const finished = nextIndex >= totalQuestions;
    const correctCount = Object.values(progress.answers).filter((a) => a.isCorrect).length;
    update({
      ...progress,
      currentQuestionIndex: nextIndex,
      completed: finished,
      lastScore: finished ? Math.round((correctCount / totalQuestions) * 100) : progress.lastScore,
    });
    setUserInput("");
    setChecked(null);
  }

  function handleRestart() {
    reset();
    setUserInput("");
    setChecked(null);
  }

  function handleCancel() {
    if (!window.confirm("לבטל את המבחן? ההתקדמות שלך תימחק.")) return;
    reset();
    router.push("/exams");
  }

  if (!question || progress.completed) {
    const answered = Object.entries(progress.answers);
    const correctCount = answered.filter(([, a]) => a.isCorrect).length;
    const mistakes = answered.filter(([, a]) => !a.isCorrect);
    const scorePct = progress.lastScore ?? Math.round((correctCount / totalQuestions) * 100);

    return (
      <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
        <h2 className="text-right text-xl font-extrabold text-slate-900">סיכום מבחן: {exam.title}</h2>

        <div className="mt-4 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
          <p className="text-3xl font-extrabold">
            {correctCount} / {totalQuestions}
          </p>
          <p className="mt-1 text-sm font-bold text-white/90">{scorePct}%</p>
        </div>

        {mistakes.length > 0 && (
          <div className="mt-4 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
            <p className="text-right text-sm font-extrabold text-black">ניתוח טעויות:</p>
            <ul className="mt-2 space-y-2">
              {mistakes.map(([qId, a]) => {
                const q = exam.questions.find((qq) => qq.id === qId);
                if (!q) return null;
                return (
                  <li key={qId} className="rounded-lg bg-red-50/70 px-3 py-2 text-right">
                    <p dir="ltr" className="font-mono text-sm font-bold text-slate-700">
                      {q.expression}
                    </p>
                    <p className="mt-1 text-xs text-red-700">
                      התשובה שלך: <bdi dir="ltr">{a.userAnswer || "—"}</bdi>
                    </p>
                    <p className="text-xs text-emerald-700">
                      התשובה הנכונה: <bdi dir="ltr">{q.expectedAnswer}</bdi>
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleRestart}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/60 bg-white/40 py-3 text-sm font-bold text-slate-700 transition hover:bg-white/70"
          >
            <RotateCcw className="size-4" strokeWidth={2} />
            נסה שוב
          </button>
          {subjectTool?.href && (
            <Link
              href={subjectTool.href}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-sm font-bold text-white transition hover:brightness-105"
            >
              תרגול חופשי · {subjectTool.label}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const hint = (question.mode && MODE_HINTS[question.mode]) || ANSWER_HINTS[exam.subject];

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-xs font-bold text-black">
          שאלה {index + 1} מתוך {totalQuestions}
        </span>
        <h2 className="min-w-0 flex-1 truncate text-right text-lg font-extrabold text-slate-900">
          {exam.title}
        </h2>
        <button
          type="button"
          onClick={handleCancel}
          aria-label="ביטול מבחן"
          title="ביטול מבחן"
          className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <X className="size-5" strokeWidth={2} />
        </button>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/40">
        <div
          className="h-full rounded-full bg-[#2F6FED] transition-all"
          style={{ width: `${(index / totalQuestions) * 100}%` }}
        />
      </div>

      <div className="mt-5 rounded-xl bg-white/50 px-4 py-4 text-center">
        <ExpressionDisplay expression={question.expression} />
      </div>

      {hint && <p className="mt-2 text-right text-xs font-bold text-black">{hint}</p>}

      <input
        type="text"
        dir="ltr"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          if (checked) handleNext();
          else handleCheck();
        }}
        disabled={!!checked}
        placeholder="התשובה שלך"
        aria-label="התשובה שלך"
        className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none disabled:opacity-70"
      />

      {checked && (
        <>
          <div
            className={`mt-3 flex items-center gap-2 rounded-xl px-4 py-3 ${
              checked.isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            {checked.isCorrect ? (
              <CheckCircle2 className="size-5 shrink-0" strokeWidth={2} />
            ) : (
              <XCircle className="size-5 shrink-0" strokeWidth={2} />
            )}
            <span className="text-sm font-bold">
              {checked.isCorrect ? (
                "נכון!"
              ) : (
                <>
                  לא נכון — התשובה הנכונה: <bdi dir="ltr" className="font-mono">{checked.correctAnswer}</bdi>
                </>
              )}
            </span>
          </div>
          <StepsPanel steps={checked.steps} />
        </>
      )}

      <button
        type="button"
        onClick={checked ? handleNext : handleCheck}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        {checked ? (
          <>
            השאלה הבאה
            <ArrowLeft className="size-5" strokeWidth={2} />
          </>
        ) : (
          "בדוק תשובה"
        )}
      </button>
    </div>
  );
}
