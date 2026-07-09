"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, LineChart, ScanText, Search, Sigma, X } from "lucide-react";
import { allConversionItemsFlat, type AllConversionItem } from "@/config/allConversionsData";
import { addRecentConversionId } from "@/lib/recentConversions";
import { evaluateMathExpression, looksLikeMathExpression } from "@/lib/mathEvaluator";

interface SystemAction {
  id: string;
  label: string;
  icon: typeof Search;
  keywords: string[];
}

const SYSTEM_ACTIONS: SystemAction[] = [
  { id: "ocr", label: "סריקת OCR", icon: ScanText, keywords: ["ocr", "סריקה", "סרוק", "תמונה"] },
  { id: "equations", label: "פתרון משוואות", icon: Sigma, keywords: ["משוואות", "משוואה", "equation"] },
  { id: "graph", label: "שרטוט גרף", icon: LineChart, keywords: ["גרף", "שרטוט", "graph"] },
];

const MAX_RESULTS = 6;

function formatMathResult(n: number): string {
  const rounded = Math.round(n * 1e8) / 1e8;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

export default function SmartSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim();

  const mathResult = useMemo(() => {
    if (!looksLikeMathExpression(trimmedQuery)) return null;
    return evaluateMathExpression(trimmedQuery);
  }, [trimmedQuery]);

  const matchedConversions = useMemo(() => {
    if (!trimmedQuery) return [];
    const q = trimmedQuery.toLowerCase();
    return allConversionItemsFlat
      .filter((item) => item.label.includes(trimmedQuery) || item.id.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS);
  }, [trimmedQuery]);

  const matchedActions = useMemo(() => {
    if (!trimmedQuery) return [];
    const q = trimmedQuery.toLowerCase();
    return SYSTEM_ACTIONS.filter(
      (action) =>
        action.label.includes(trimmedQuery) ||
        action.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [trimmedQuery]);

  const isSearching = trimmedQuery.length > 0;
  const hasResults = mathResult !== null || matchedConversions.length > 0 || matchedActions.length > 0;

  function goToConversion(item: AllConversionItem) {
    addRecentConversionId(item.id);
    router.push(`/AllConversions?item=${item.id}`);
    setQuery("");
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפשו כל דבר: מטבע, OCR, משוואות......."
          aria-label="חיפוש חכם"
          className="mt-0 w-full rounded-xl border-2 border-blue-400 bg-blue-50 py-3 pr-11 pl-11 text-right text-lg font-bold text-black placeholder:text-lg placeholder:font-bold placeholder:text-black focus:outline-none"
        />
        {isSearching && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="נקה חיפוש"
            className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-slate-500 hover:text-slate-800"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {isSearching && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border-2 border-blue-200 bg-white p-3 shadow-xl">
          {mathResult !== null && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-blue-600 px-4 py-3 text-white">
              <span className="flex items-center gap-2 text-sm font-bold opacity-90">
                <Calculator className="size-4" />
                תוצאה
              </span>
              <span dir="ltr" className="text-xl font-extrabold">
                {formatMathResult(mathResult)}
              </span>
            </div>
          )}

          {!hasResults && (
            <p className="py-4 text-center text-sm font-bold text-slate-500">
              לא נמצאו תוצאות
            </p>
          )}

          {matchedConversions.length > 0 && (
            <div className="mb-2">
              <p className="px-1 pb-1 text-right text-xs font-bold text-slate-400">מחשבוני המרה</p>
              <div className="flex flex-col gap-1">
                {matchedConversions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goToConversion(item)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-right transition hover:bg-blue-50"
                  >
                    <span
                      className={`flex size-8 items-center justify-center rounded-lg ${item.color}`}
                    >
                      <item.icon className="size-4 text-white" strokeWidth={2} />
                    </span>
                    <span className="text-sm font-bold text-black">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchedActions.length > 0 && (
            <div>
              <p className="px-1 pb-1 text-right text-xs font-bold text-slate-400">פעולות מערכת</p>
              <div className="flex flex-col gap-1">
                {matchedActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-right"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-purple-400">
                        <action.icon className="size-4 text-white" strokeWidth={2} />
                      </span>
                      <span className="text-sm font-bold text-black">{action.label}</span>
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-400">
                      בקרוב
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
