"use client";

import Link from "next/link";
import { Heebo } from "next/font/google";
import { ArrowRight } from "lucide-react";
import SystemOfEquationsSolver from "@/components/mathematics/SystemOfEquationsSolver";

const heebo = Heebo({ subsets: ["hebrew", "latin"], weight: ["400", "500", "700", "800"] });

export default function SystemOfEquationsPage() {
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
        <h1 className="text-right text-2xl font-extrabold text-orange-500 sm:text-3xl">מערכת משוואות ב-2 נעלמים</h1>
        <p className="mt-4 text-right text-sm font-medium text-slate-600">
          הזינו שתי משוואות לינאריות (למשל x + y = 5 ו-2x - y = 1), בחרו שיטת פתרון וקבלו פתרון מדויק שלב אחר שלב, עם הצגה גרפית של נקודת החיתוך
        </p>

        <div className="mt-6">
          <SystemOfEquationsSolver />
        </div>
      </div>

      <Link
        href="/mathematics"
        aria-label="חזרה למסך הקודם"
        className="fixed bottom-6 right-6 flex size-14 items-center justify-center rounded-full border border-white/60 bg-white/40 text-[#2F6FED] shadow-[0_0_18px_rgba(47,111,237,0.4)] backdrop-blur-xl backdrop-saturate-150 transition hover:bg-white/60 active:scale-95"
      >
        <ArrowRight className="size-6" strokeWidth={2.5} />
      </Link>
    </div>
  );
}
