"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Heebo } from "next/font/google";
import { ArrowRight, Camera, ChevronDown, Search, X } from "lucide-react";
import {
  allConversionsGroups,
  formatConversionNumber,
  glowColor,
  type AllConversionItem,
} from "@/config/allConversionsData";
import CurrencyConverterFields from "@/components/shared/CurrencyConverterFields";
import BaseConverterFields from "@/components/shared/BaseConverterFields";
import { addRecentConversionId } from "@/lib/recentConversions";

const heebo = Heebo({ subsets: ["hebrew", "latin"], weight: ["400", "500", "700", "800"] });

interface ItemState {
  value: string;
  sourceUnitId: string;
  targetUnitId: string;
}

const flatItems = allConversionsGroups.flatMap((group) =>
  group.items.map((item) => ({ ...item, groupId: group.id, groupLabel: group.label })),
);

const initialItemStates: Record<string, ItemState> = Object.fromEntries(
  flatItems.map((item) => [
    item.id,
    {
      value: "1",
      sourceUnitId: item.units[0].id,
      targetUnitId: item.units[1]?.id ?? item.units[0].id,
    },
  ]),
);

function numberToInputValue(n: number): string {
  return String(Math.round(n * 1e6) / 1e6);
}

export default function AllConversionsPage() {
  return (
    <Suspense fallback={null}>
      <AllConversions />
    </Suspense>
  );
}

function AllConversions() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [activeGroupId, setActiveGroupId] = useState(allConversionsGroups[0].id);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemStates, setItemStates] = useState(initialItemStates);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const activeGroup =
    allConversionsGroups.find((g) => g.id === activeGroupId) ?? allConversionsGroups[0];

  const filteredResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return flatItems.filter((item) => item.label.includes(q));
  }, [query]);

  useEffect(() => {
    const itemId = searchParams.get("item");
    if (!itemId) return;
    const item = flatItems.find((i) => i.id === itemId);
    if (!item) return;
    setActiveGroupId(item.groupId);
    setExpandedId(item.id);
    addRecentConversionId(item.id);
    requestAnimationFrame(() => {
      itemRefs.current[item.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [searchParams]);

  function updateItemState(id: string, patch: Partial<ItemState>) {
    setItemStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function goToItem(item: AllConversionItem & { groupId: string }) {
    setActiveGroupId(item.groupId);
    setExpandedId(item.id);
    setQuery("");
    addRecentConversionId(item.id);
    requestAnimationFrame(() => {
      itemRefs.current[item.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function toggleExpand(item: AllConversionItem) {
    const willExpand = expandedId !== item.id;
    setExpandedId(willExpand ? item.id : null);
    if (willExpand) {
      addRecentConversionId(item.id);
    }
  }

  function computeResult(item: AllConversionItem, state: ItemState) {
    const value = parseFloat(state.value);
    if (Number.isNaN(value)) return null;
    const source = item.units.find((u) => u.id === state.sourceUnitId) ?? item.units[0];
    const target = item.units.find((u) => u.id === state.targetUnitId) ?? item.units[0];
    return target.fromBase(source.toBase(value));
  }

  function handleSwap(item: AllConversionItem) {
    const state = itemStates[item.id];
    const result = computeResult(item, state);
    updateItemState(item.id, {
      value: result !== null ? numberToInputValue(result) : state.value,
      sourceUnitId: state.targetUnitId,
      targetUnitId: state.sourceUnitId,
    });
  }

  return (
    <div
      dir="rtl"
      className={`${heebo.className} relative min-h-screen overflow-hidden px-4 py-6 pb-16 sm:px-8`}
      style={{
        background:
          "linear-gradient(160deg, #aebdf2, #cbaee6 45%, #9fe0e8 100%)",
      }}
    >
      <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-white/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 size-80 rounded-full bg-cyan-200/40 blur-3xl" />

      <div className="relative">
        <h1 className="text-right text-2xl font-extrabold text-slate-800 sm:text-3xl">
          כל מחשבוני ההמרה במקום אחד
        </h1>
        <p className="mt-4 text-right text-sm font-medium text-slate-600">
          63 מחשבוני המרה · 12 קבוצות
        </p>

        <div className="relative mt-2">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חפשו מחשבון המרה..."
            aria-label="חיפוש מחשבון המרה"
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

        {query.trim() ? (
          <div role="listbox" aria-label="תוצאות חיפוש" className="mt-4 flex flex-col gap-2">
            {filteredResults.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">לא נמצאו תוצאות</p>
            ) : (
              filteredResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => goToItem(item)}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-4 py-3 text-right backdrop-blur-xl backdrop-saturate-150 transition hover:bg-white/55"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex size-9 items-center justify-center rounded-full ${item.color}`}
                      style={{ boxShadow: `0 0 14px ${glowColor(item.color)}99` }}
                    >
                      <item.icon className="size-5 text-white" strokeWidth={2} />
                    </span>
                    <span className="text-sm font-bold text-slate-800">{item.label}</span>
                  </span>
                  <span className="rounded-full bg-white/60 px-2 py-1 text-xs font-bold text-slate-500">
                    {item.groupLabel}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            <div
              role="tablist"
              aria-label="קבוצות המרה"
              className="mt-5 flex flex-row-reverse gap-2 overflow-x-auto pb-1"
            >
              {allConversionsGroups.map((group) => {
                const isActive: boolean = activeGroupId === group.id;
                return (
                  <button
                    key={group.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive ? "true" : "false"}
                    onClick={() => setActiveGroupId(group.id)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                      isActive
                        ? "bg-[#2F6FED] text-white shadow-[0_0_14px_rgba(47,111,237,0.6)]"
                        : "border border-white/60 bg-white/30 text-slate-600 backdrop-blur-xl hover:bg-white/50"
                    }`}
                  >
                    {group.label} <span className="opacity-70">· {group.items.length}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {activeGroup.items.map((item) => {
                const state = itemStates[item.id];
                const expanded = expandedId === item.id;
                const result = computeResult(item, state);
                const sourceUnit =
                  item.units.find((u) => u.id === state.sourceUnitId) ?? item.units[0];
                const targetUnit =
                  item.units.find((u) => u.id === state.targetUnitId) ?? item.units[0];
                const accent = glowColor(item.color);

                return (
                  <div
                    key={item.id}
                    ref={(el) => {
                      itemRefs.current[item.id] = el;
                    }}
                    className="overflow-hidden rounded-2xl border border-white/60 bg-white/35 backdrop-blur-xl backdrop-saturate-150"
                  >
                    <button
                      type="button"
                      aria-expanded={expanded ? "true" : "false"}
                      aria-label={`${expanded ? "כווץ" : "הרחב"} ${item.label}`}
                      onClick={() => toggleExpand(item)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-right"
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`flex size-8 items-center justify-center rounded-full ${item.color}`}
                          style={{ boxShadow: `0 0 14px ${accent}99` }}
                        >
                          <item.icon className="size-4 text-white" strokeWidth={2} />
                        </span>
                        <span className="text-base font-bold text-slate-800">{item.label}</span>
                      </span>
                      <ChevronDown
                        className={`size-5 shrink-0 text-slate-400 transition-transform duration-200 ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {expanded && (
                      <div className="animate-in fade-in px-4 pb-5 duration-200">
                        {item.id === "currency" ? (
                          <CurrencyConverterFields accent={accent} />
                        ) : item.id === "baseConverter" ? (
                          <BaseConverterFields accent={accent} />
                        ) : (
                          <>
                            <div className="rounded-2xl border border-white/60 bg-white/45 px-4 py-4">
                              <div className="flex flex-row-reverse flex-wrap gap-2">
                                {item.units.map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    aria-pressed={state.sourceUnitId === u.id ? "true" : "false"}
                                    onClick={() =>
                                      updateItemState(item.id, { sourceUnitId: u.id })
                                    }
                                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                      state.sourceUnitId === u.id
                                        ? "bg-[#2F6FED] text-white"
                                        : "border border-slate-300/60 bg-white/50 text-slate-500 hover:bg-white/80"
                                    }`}
                                  >
                                    {u.label}
                                  </button>
                                ))}
                              </div>
                              <label
                                htmlFor={`${item.id}-value`}
                                className="mt-3 block text-right text-xs font-medium text-slate-500"
                              >
                                {sourceUnit.label}
                              </label>
                              <input
                                id={`${item.id}-value`}
                                type="number"
                                inputMode="decimal"
                                dir="ltr"
                                value={state.value}
                                onChange={(e) =>
                                  updateItemState(item.id, { value: e.target.value })
                                }
                                className="mt-1 w-full bg-transparent text-left text-[30px] font-bold text-slate-800 focus:outline-none"
                              />
                            </div>

                            <div className="-my-3 flex justify-center">
                              <button
                                type="button"
                                onClick={() => handleSwap(item)}
                                aria-label={`החלף כיוון עבור ${item.label}`}
                                className="z-10 flex size-11 items-center justify-center rounded-full text-white transition active:scale-90"
                                style={{
                                  background: `linear-gradient(135deg, ${accent}, #2F6FED)`,
                                  boxShadow: `0 0 16px ${accent}99`,
                                }}
                              >
                                <span className="text-lg leading-none">⇅</span>
                              </button>
                            </div>

                            <div
                              className="rounded-2xl bg-white/45 px-4 py-4"
                              style={{ border: `1.5px solid ${accent}99` }}
                            >
                              <div className="flex flex-row-reverse flex-wrap gap-2">
                                {item.units.map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    aria-pressed={state.targetUnitId === u.id ? "true" : "false"}
                                    onClick={() =>
                                      updateItemState(item.id, { targetUnitId: u.id })
                                    }
                                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                      state.targetUnitId === u.id
                                        ? "bg-[#2F6FED] text-white"
                                        : "border border-slate-300/60 bg-white/50 text-slate-500 hover:bg-white/80"
                                    }`}
                                  >
                                    {u.label}
                                  </button>
                                ))}
                              </div>
                              <p className="mt-3 text-right text-xs font-medium text-slate-500">
                                {targetUnit.label}
                              </p>
                              <p
                                dir="ltr"
                                className="mt-1 text-left text-[30px] font-bold text-slate-800"
                              >
                                {result === null ? "—" : formatConversionNumber(result)}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-white/40 bg-white/20 px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-black/70">
            <Camera className="size-4 text-white" strokeWidth={2} />
          </span>
          <p className="text-right text-sm text-slate-800">
            <span className="font-bold">טיפ:</span> לא בטוח מה לבחור? צלם את התרגיל והמערכת תזהה עבורך.
          </p>
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
