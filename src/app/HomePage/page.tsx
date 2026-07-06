"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"conversions" | "math">(
    "conversions",
  );

  return (
    <div className="min-h-screen bg-white px-6 py-8 sm:px-10">
      <h1 className="mt-8 text-right text-2xl font-extrabold text-orange-500 sm:text-3xl">
        מתמטיקה, המרות ופתרון משוואות
      </h1>
      <input
        type="text"
        placeholder="חפשו כל דבר: מטבע, OCR, משוואות......."
        className="mt-6 w-full rounded-xl border-2 border-blue-400 bg-blue-50 px-4 py-3 text-right text-lg font-bold text-black placeholder:text-lg placeholder:font-bold placeholder:text-black focus:outline-none"
      />
      <h2 className="mt-8 text-right text-lg font-bold text-gray-600">
        אחרונים
      </h2>
      <div className="mt-4 flex flex-row-reverse justify-end gap-4">
        <div className="flex h-24 w-32 flex-col items-start justify-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-3 pt-3">
          <button type="button" aria-label="טריגו" className="size-9 rounded-lg shadow-sm transition hover:brightness-95 active:brightness-90 bg-pink-400" />
          <span className="text-base font-bold text-black">טריגו</span>
        </div>
        <div className="flex h-24 w-32 flex-col items-start justify-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-3 pt-3">
          <button type="button" aria-label="ריבועית" className="size-9 rounded-lg shadow-sm transition hover:brightness-95 active:brightness-90 bg-purple-400" />
          <span className="text-base font-bold text-black">ריבועית</span>
        </div>
        <div className="flex h-24 w-32 flex-col items-start justify-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-3 pt-3">
          <button type="button" aria-label="מטבעות" className="size-9 rounded-lg shadow-sm transition hover:brightness-95 active:brightness-90 bg-blue-200" />
          <span className="text-base font-bold text-black">מטבעות</span>
        </div>
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
        <div className="flex h-36 w-full flex-col items-start justify-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 pt-4">
          <button type="button" aria-label="מטבעות" className="size-12 rounded-lg shadow-sm transition hover:brightness-95 active:brightness-90 bg-cyan-600" />
          <span className="text-lg font-bold text-black">מטבעות</span>
        </div>
        <div className="flex h-36 w-full flex-col items-start justify-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 pt-4">
          <button type="button" aria-label="אורך" className="size-12 rounded-lg shadow-sm transition hover:brightness-95 active:brightness-90 bg-green-300" />
          <span className="text-lg font-bold text-black">אורך</span>
        </div>
        <div className="flex h-36 w-full flex-col items-start justify-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 pt-4">
          <button type="button" aria-label="משקל" className="size-12 rounded-lg shadow-sm transition hover:brightness-95 active:brightness-90 bg-orange-300" />
          <span className="text-lg font-bold text-black">משקל</span>
        </div>
        <div className="flex h-36 w-full flex-col items-start justify-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 pt-4">
          <button type="button" aria-label="נפח" className="size-12 rounded-lg shadow-sm transition hover:brightness-95 active:brightness-90 bg-teal-300" />
          <span className="text-lg font-bold text-black">נפח</span>
        </div>
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
  );
}
