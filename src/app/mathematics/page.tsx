"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heebo } from "next/font/google";
import { ArrowRight, Search, Shuffle, X } from "lucide-react";
import { mathItems, type MathItem } from "@/config/mathematicsData";
import { generateDailyChallenge } from "@/config/challenges";
import { setPendingChallenge } from "@/lib/dailyChallengeSession";
import Dashboard from "@/components/mathematics/Dashboard";

const heebo = Heebo({ subsets: ["hebrew", "latin"], weight: ["400", "500", "700", "800"] });

const ALGEBRA_TRACK_IDS = [
  "scientificCalculator",
  "simpleCalculator",
  "logarithmicEquations",
  "powersAlgebra",
  "linearEquations",
  "functionAnalysis",
  "systemOfEquations",
  "quadraticEquations",
  "systemOf3Equations",
  "integralCalculator",
  "complexNumbers",
  "circleGeometry",
];

export default function MathematicsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const algebraItems = useMemo(
    () =>
      ALGEBRA_TRACK_IDS.map((id) => mathItems.find((item) => item.id === id)).filter(
        (item): item is MathItem => Boolean(item),
      ),
    [],
  );

  const filteredItems = useMemo(() => {
    const q = query.trim();
    if (!q) return algebraItems;
    return algebraItems.filter((item) => item.label.includes(q));
  }, [query, algebraItems]);

  const handleDailyPractice = () => {
    const challenge = generateDailyChallenge("algebra");
    setPendingChallenge(challenge);
    router.push(challenge.href);
  };

  return (
    <div
      dir="rtl"
      className={`${heebo.className} relative min-h-screen overflow-hidden px-4 py-6 pb-16 sm:px-8`}
      style={{
        background: "linear-gradient(160deg, #aebdf2, #cbaee6 45%, #9fe0e8 100%)",
      }}
    >
      <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-white/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 size-80 rounded-full bg-cyan-200/40 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="text-right">
            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">מסלול אלגברה</h1>
            <p className="mt-1 text-sm font-bold text-indigo-400">משוואות, פרמטרים ומערכות</p>
          </div>
          <Link
            href="/HomePage"
            aria-label="חזרה למסך הקודם"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition hover:brightness-95 active:brightness-90"
          >
            <ArrowRight className="size-5 text-slate-700" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="בחר את סוג המשוואה שאתה מנסה לפתור:"
            aria-label="חיפוש כלי מתמטי"
            className="w-full rounded-2xl border border-white/60 bg-white/35 py-3 pr-11 pl-11 text-right text-base font-bold text-slate-800 placeholder:font-bold placeholder:text-slate-400 backdrop-blur-xl backdrop-saturate-150 focus:border-white/90 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="נקה חיפוש"
              className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-700"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleDailyPractice}
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-indigo-600 px-5 py-4 text-right shadow-sm transition hover:brightness-105 active:brightness-95"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
            <Shuffle className="size-5 text-white" strokeWidth={2} />
          </span>
          <span className="flex-1">
            <span className="block text-base font-extrabold text-white">תרגול יומי</span>
            <span className="block text-xs font-medium text-white/80">
              המערכת בוחרת עבורך תרגיל אקראי מהמסלול
            </span>
          </span>
        </button>

        {!query.trim() && (
          <h2 className="mt-6 text-right text-base font-extrabold text-slate-900">
            בחר כלי מתמטי לתרגול
          </h2>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          {filteredItems.length === 0 ? (
            <p className="col-span-2 py-6 text-center text-sm text-slate-500">לא נמצאו תוצאות</p>
          ) : (
            filteredItems.map((item) => {
              const cardClass = `flex h-28 flex-col items-end justify-between rounded-2xl border border-white/60 bg-white/80 p-3 text-right shadow-sm backdrop-blur-xl backdrop-saturate-150 transition ${
                item.comingSoon ? "opacity-60" : "hover:bg-white active:brightness-95"
              }`;
              const cardContent = (
                <>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-extrabold text-white">
                    {item.badge}
                  </span>
                  <span className="text-sm font-bold text-slate-800">{item.label}</span>
                </>
              );
              return item.href && !item.comingSoon ? (
                <Link key={item.id} href={item.href} className={cardClass}>
                  {cardContent}
                </Link>
              ) : (
                <span key={item.id} aria-disabled="true" className={cardClass}>
                  {cardContent}
                </span>
              );
            })
          )}
        </div>

        <Dashboard />
      </div>
    </div>
  );
}
