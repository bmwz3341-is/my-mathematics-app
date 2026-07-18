"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { exams, type Exam } from "@/lib/exams";
import { getExamProgress, type ExamProgress } from "@/lib/examProgress";
import { mathItems } from "@/config/mathematicsData";

const DIFFICULTY_LABEL: Record<string, string> = { easy: "קל", medium: "בינוני", hard: "קשה" };
const DIFFICULTY_COLOR: Record<string, string> = { easy: "bg-emerald-500", medium: "bg-amber-500", hard: "bg-red-500" };

function shuffled<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** The exam list, reached from the home screen's "מרכז מבחנים" card. Re-shuffled on every visit. */
export default function ExamsPage() {
  const [orderedExams] = useState<Exam[]>(() => shuffled(exams));
  const [progressByExam, setProgressByExam] = useState<Record<string, ExamProgress>>({});

  useEffect(() => {
    const map: Record<string, ExamProgress> = {};
    for (const exam of exams) map[exam.id] = getExamProgress(exam.id);
    setProgressByExam(map);
  }, []);

  return (
    <div
      dir="rtl"
      className="min-h-screen px-4 py-6 sm:px-8"
      style={{ background: "linear-gradient(160deg, #3d4f8f, #4a2f6b 45%, #3a7a8f 100%)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-right">
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">מרכז מבחנים</h1>
          <p className="mt-1 text-sm font-bold text-white">תרגול מובנה, שאלה אחר שאלה</p>
        </div>
        <Link
          href="/HomePage"
          aria-label="חזרה למסך הבית"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition hover:brightness-95 active:brightness-90"
        >
          <ArrowRight className="size-5 text-slate-700" strokeWidth={2.5} />
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {orderedExams.map((exam) => {
          const tool = mathItems.find((item) => item.id === exam.subject);
          const progress = progressByExam[exam.id];
          const answeredCount = progress ? Object.keys(progress.answers).length : 0;
          const pct = Math.round((answeredCount / exam.questions.length) * 100);

          return (
            <Link
              key={exam.id}
              href={`/exams/${exam.id}`}
              className="flex flex-col gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-right transition hover:bg-white/20"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                    DIFFICULTY_COLOR[exam.difficulty] ?? "bg-slate-500"
                  }`}
                >
                  {DIFFICULTY_LABEL[exam.difficulty] ?? exam.difficulty}
                </span>
                <span className="text-sm font-bold text-white">{exam.title}</span>
              </div>

              <p className="text-xs font-bold text-white">
                {tool?.label ?? exam.subject} · {exam.questions.length} שאלות
              </p>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-cyan-300" style={{ width: `${pct}%` }} />
              </div>

              {progress?.completed && (
                <span className="text-[10px] font-bold text-emerald-300">הושלם · ציון {progress.lastScore}%</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
