"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Beaker, Coins, Ruler, Weight } from "lucide-react";
import {
  allConversionItemsFlat,
  type AllConversionItem,
} from "@/config/allConversionsData";
import { getRecentConversionIds } from "@/lib/recentConversions";
import SmartSearchBar from "@/components/shared/SmartSearchBar";

const DEFAULT_RECENT_IDS = ["currency", "length", "weight"];

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"conversions" | "math">(
    "conversions",
  );
  const [recentItems, setRecentItems] = useState<AllConversionItem[]>([]);

  useEffect(() => {
    const recentIds = getRecentConversionIds();
    const ids = [...recentIds, ...DEFAULT_RECENT_IDS.filter((id) => !recentIds.includes(id))];
    const items = ids
      .map((id) => allConversionItemsFlat.find((item) => item.id === id))
      .filter((item): item is AllConversionItem => Boolean(item))
      .slice(0, 3);
    setRecentItems(items);
  }, []);

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
        <h2 className="mt-8 text-right text-lg font-extrabold text-orange-500">
          אחרונים
        </h2>
        <div className="mt-4 flex flex-row-reverse justify-end gap-4">
          {recentItems.map((item) => (
            <Link
              key={item.id}
              href={`/AllConversions?item=${item.id}`}
              aria-label={item.label}
              className="flex h-24 w-32 flex-col items-start justify-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-3 pt-3 transition hover:brightness-95 active:brightness-90"
            >
              <span
                className={`flex size-9 items-center justify-center rounded-lg shadow-sm ${item.color}`}
              >
                <item.icon className="size-5 text-white" strokeWidth={2} />
              </span>
              <span className="text-base font-bold text-black">{item.label}</span>
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-row-reverse rounded-xl border-2 border-blue-200 bg-blue-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("math")}
            className={`flex-1 rounded-lg py-2 text-lg font-bold transition ${
              activeTab === "math"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-purple-600"
            }`}
          >
            מתמטיקה
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("conversions")}
            className={`flex-1 rounded-lg py-2 text-lg font-bold transition ${
              activeTab === "conversions"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-purple-600"
            }`}
          >
            המרות
          </button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Link
            href="/AllConversions?item=currency"
            aria-label="מטבעות"
            className="flex h-36 w-full flex-col items-start justify-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 pt-4 text-right transition hover:brightness-95 active:brightness-90"
          >
            <span className="flex size-12 items-center justify-center rounded-lg shadow-sm bg-cyan-600">
              <Coins className="size-6 text-white" strokeWidth={2} />
            </span>
            <span className="text-lg font-bold text-black">מטבעות</span>
          </Link>
          <Link
            href="/AllConversions?item=length"
            aria-label="אורך"
            className="flex h-36 w-full flex-col items-start justify-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 pt-4 text-right transition hover:brightness-95 active:brightness-90"
          >
            <span className="flex size-12 items-center justify-center rounded-lg shadow-sm bg-green-300">
              <Ruler className="size-6 text-white" strokeWidth={2} />
            </span>
            <span className="text-lg font-bold text-black">אורך</span>
          </Link>
          <Link
            href="/AllConversions?item=weight"
            aria-label="משקל"
            className="flex h-36 w-full flex-col items-start justify-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 pt-4 text-right transition hover:brightness-95 active:brightness-90"
          >
            <span className="flex size-12 items-center justify-center rounded-lg shadow-sm bg-orange-300">
              <Weight className="size-6 text-white" strokeWidth={2} />
            </span>
            <span className="text-lg font-bold text-black">משקל</span>
          </Link>
          <Link
            href="/AllConversions?item=volume"
            aria-label="נפח"
            className="flex h-36 w-full flex-col items-start justify-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 pt-4 text-right transition hover:brightness-95 active:brightness-90"
          >
            <span className="flex size-12 items-center justify-center rounded-lg shadow-sm bg-teal-300">
              <Beaker className="size-6 text-white" strokeWidth={2} />
            </span>
            <span className="text-lg font-bold text-black">נפח</span>
          </Link>
        </div>
        <button
          type="button"
          onClick={() => {
            if (activeTab === "conversions") {
              router.push("/AllConversions");
            }
          }}
          className="mt-6 w-full rounded-xl bg-blue-50 py-3 text-center text-lg font-bold text-blue-600 transition hover:brightness-95 active:brightness-90"
        >
          {activeTab === "conversions" ? "כל ההמרות" : "מתמטיקה"}
          <span className="ms-2 text-blue-800">{">>"}</span>
        </button>
      </div>
    </div>
  );
}
