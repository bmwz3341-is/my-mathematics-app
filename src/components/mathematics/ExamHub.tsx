"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";

/**
 * Single teaser card replacing the home screen's old "OCR tip" block.
 * Clicking it navigates to `/exams`, which lists every available exam (in
 * random order) — see `src/app/exams/page.tsx`.
 */
export default function ExamHub() {
  return (
    <Link
      href="/exams"
      aria-label="מרכז מבחנים"
      className="mt-4 flex h-24 w-full items-center gap-3 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 text-right transition hover:brightness-95 active:brightness-90"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-500 shadow-sm">
        <ClipboardList className="size-5 text-white" strokeWidth={2} />
      </span>
      <span className="flex-1">
        <span className="block text-base font-bold text-black">מרכז מבחנים</span>
        <span className="block text-xs font-bold text-black">תרגול מובנה — שאלה אחר שאלה, עם ציון וניתוח טעויות</span>
      </span>
    </Link>
  );
}
