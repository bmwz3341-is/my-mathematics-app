"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heebo } from "next/font/google";
import { ArrowRight, ArrowRightLeft, Camera, Search, Shuffle, X } from "lucide-react";

const heebo = Heebo({ subsets: ["hebrew", "latin"], weight: ["400", "500", "700", "800"] });

interface TrackCard {
  id: string;
  label: string;
  href: string;
  badge?: string;
  icon?: typeof ArrowRightLeft;
}

const CARDS: TrackCard[] = [
  {
    id: "trigonometry",
    label: "טריגונומטריה",
    href: "/TrigoGeo",
    badge: "sin∆",
  },
];

export default function SpaceGeometryPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filteredCards = useMemo(() => {
    const q = query.trim();
    if (!q) return CARDS;
    return CARDS.filter((card) => card.label.includes(q));
  }, [query]);

  const handleDailyPractice = () => {
    const pick = CARDS[Math.floor(Math.random() * CARDS.length)];
    router.push(pick.href);
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
            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">מסלול מרחב וגיאומטריה</h1>
            <p className="mt-1 text-sm font-bold text-black">וקטורים, טריגו ומישורים</p>
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
            placeholder="בחר את הכלי שברצונך להשתמש בו:"
            aria-label="חיפוש כלי"
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
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-emerald-600 px-5 py-4 text-right shadow-sm transition hover:brightness-105 active:brightness-95"
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

        <div className="mt-4 grid grid-cols-2 gap-3">
          {filteredCards.length === 0 ? (
            <p className="col-span-2 py-6 text-center text-sm text-slate-500">לא נמצאו תוצאות</p>
          ) : (
            filteredCards.map((card) => (
              <Link
                key={card.id}
                href={card.href}
                className="flex h-28 flex-col items-end justify-between rounded-2xl border border-white/60 bg-white/80 p-3 text-right shadow-sm backdrop-blur-xl backdrop-saturate-150 transition hover:bg-white active:brightness-95"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-sm font-extrabold text-white">
                  {card.icon ? <card.icon className="size-5" strokeWidth={2} /> : card.badge}
                </span>
                <span className="text-sm font-bold text-slate-800">{card.label}</span>
              </Link>
            ))
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-white/40 bg-white/20 px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-black/70">
            <Camera className="size-4 text-white" strokeWidth={2} />
          </span>
          <p className="text-right text-sm text-slate-800">
            <span className="font-bold">טיפ:</span> לא בטוח מה לבחור? צלם את התרגיל והמערכת תזהה עבורך.
          </p>
        </div>
      </div>
    </div>
  );
}
