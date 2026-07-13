"use client";

import Link from "next/link";
import { Camera, ChartColumn, Superscript, Toolbox, Triangle } from "lucide-react";
import SmartSearchBar from "@/components/shared/SmartSearchBar";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(160deg,#3d4f8f,#4a2f6b_45%,#3a7a8f_100%)] px-6 py-8 sm:px-10">
      <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-white/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 size-80 rounded-full bg-cyan-300/25 blur-3xl" />

      <div className="relative">
        <h1 className="mt-8 text-right text-2xl font-extrabold text-orange-500 sm:text-3xl">
          מתמטיקה, המרות ופתרון משוואות
        </h1>
        <div className="mt-6">
          <SmartSearchBar />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Link
            href="/space-geometry"
            aria-label="מסלול מרחב וגיאומטריה"
            className="flex h-32 w-full flex-col items-start justify-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 pt-4 text-right transition hover:brightness-95 active:brightness-90"
          >
            <span className="flex size-10 items-center justify-center rounded-lg shadow-sm bg-green-500">
              <Triangle className="size-5 text-white" strokeWidth={2} />
            </span>
            <span className="text-base font-bold text-black">מסלול מרחב וגיאומטריה</span>
            <span className="text-xs text-gray-500">וקטורים, טריגו ומישורים</span>
          </Link>
          <Link
            href="/mathematics"
            aria-label="מסלול אלגברה"
            className="flex h-32 w-full flex-col items-start justify-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 pt-4 text-right transition hover:brightness-95 active:brightness-90"
          >
            <span className="flex size-10 items-center justify-center rounded-lg shadow-sm bg-blue-600">
              <Superscript className="size-5 text-white" strokeWidth={2} />
            </span>
            <span className="text-base font-bold text-black">מסלול אלגברה</span>
            <span className="text-xs text-gray-500">משוואות, פרמטרים ומערכות</span>
          </Link>
          <Link
            href="/AllConversions"
            aria-label="ארגז כלים טכני"
            className="flex h-32 w-full flex-col items-start justify-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 pt-4 text-right transition hover:brightness-95 active:brightness-90"
          >
            <span className="flex size-10 items-center justify-center rounded-lg shadow-sm bg-teal-500">
              <Toolbox className="size-5 text-white" strokeWidth={2} />
            </span>
            <span className="text-base font-bold text-black">ארגז כלים טכני</span>
            <span className="text-xs text-gray-500">המרות יחידות, מחשבונים כלליים</span>
          </Link>
          <Link
            href="/probability-sequences"
            aria-label="מסלול הסתברות וסדרות"
            className="flex h-32 w-full flex-col items-start justify-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 pt-4 text-right transition hover:brightness-95 active:brightness-90"
          >
            <span className="flex size-10 items-center justify-center rounded-lg shadow-sm bg-purple-500">
              <ChartColumn className="size-5 text-white" strokeWidth={2} />
            </span>
            <span className="text-base font-bold text-black">מסלול הסתברות וסדרות</span>
            <span className="text-xs text-gray-500">התפלגויות נורמלית וסטטיסטיקה</span>
          </Link>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-black/70">
            <Camera className="size-4 text-white" strokeWidth={2} />
          </span>
          <p className="text-right text-sm text-white">
            <span className="font-bold">טיפ:</span> לא בטוח מה לבחור? צלם את התרגיל והמערכת תזהה עבורך.
          </p>
        </div>
      </div>
    </div>
  );
}
