"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heebo } from "next/font/google";
import { ArrowRight, Search, X } from "lucide-react";
import { mathItems, type MathItem } from "@/config/mathematicsData";

const heebo = Heebo({ subsets: ["hebrew", "latin"], weight: ["400", "500", "700", "800"] });

export default function MathematicsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const q = query.trim();
    if (!q) return mathItems;
    return mathItems.filter((item) => item.label.includes(q));
  }, [query]);

  function handleSelect(item: MathItem) {
    if (item.href) {
      router.push(item.href);
    }
  }

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
        <h1 className="text-right text-2xl font-extrabold text-orange-500 sm:text-3xl">
          פתרון משוואות וחישובים
        </h1>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חפשו כלי מתמטי..."
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

        {!query.trim() && (
          <div
            aria-label="כלים מתמטיים"
            className="mt-5 flex flex-row-reverse gap-2 overflow-x-auto pb-1"
          >
            {mathItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                aria-disabled={item.comingSoon ? "true" : "false"}
                className={`shrink-0 rounded-full border border-white/60 bg-white/30 px-4 py-2 text-sm font-bold text-slate-600 backdrop-blur-xl transition ${
                  item.comingSoon ? "opacity-60" : "hover:bg-white/50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {filteredItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">לא נמצאו תוצאות</p>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                aria-disabled={item.comingSoon ? "true" : "false"}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/35 px-4 py-4 text-right backdrop-blur-xl backdrop-saturate-150 transition ${
                  item.comingSoon ? "opacity-60" : "hover:bg-white/55"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`flex size-9 items-center justify-center rounded-full ${item.color}`}
                  >
                    <item.icon className="size-5 text-white" strokeWidth={2} />
                  </span>
                  <span className="text-base font-bold text-slate-800">{item.label}</span>
                </span>
                {item.comingSoon ? (
                  <span className="rounded-full bg-white/60 px-2 py-1 text-xs font-bold text-slate-500">
                    בקרוב
                  </span>
                ) : (
                  <span className="text-slate-400">‹</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <Link
        href="/HomePage"
        aria-label="חזרה למסך הקודם"
        className="fixed bottom-6 right-6 flex size-14 items-center justify-center rounded-full border border-white/60 bg-white/40 text-[#2F6FED] shadow-[0_0_18px_rgba(47,111,237,0.4)] backdrop-blur-xl backdrop-saturate-150 transition hover:bg-white/60 active:scale-95"
      >
        <ArrowRight className="size-6" strokeWidth={2.5} />
      </Link>
    </div>
  );
}
