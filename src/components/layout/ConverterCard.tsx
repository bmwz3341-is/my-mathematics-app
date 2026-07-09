"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export interface ConverterCardProps {
  children: ReactNode;
  accentColor?: string;
}

export default function ConverterCard({
  children,
  accentColor = "bg-white",
}: ConverterCardProps) {
  const router = useRouter();

  return (
    <div
      className={`flex min-h-screen items-center justify-center px-6 py-8 sm:px-10 ${accentColor}`}
    >
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-xl">
        {children}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="חזרה למסך הקודם"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-base font-bold text-white shadow-sm transition hover:bg-blue-700 active:brightness-90"
          >
            חזרה
            <ArrowRight className="size-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
