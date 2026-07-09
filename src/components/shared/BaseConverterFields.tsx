"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";

export interface BaseConverterFieldsProps {
  accent: string;
}

const BASES = [
  { id: 10, label: "עשרוני (Decimal)" },
  { id: 2, label: "בינארי (Binary)" },
  { id: 16, label: "הקסדצימלי (Hex)" },
];

function isValidForBase(value: string, base: number): boolean {
  if (value.trim() === "") return false;
  const digits = base === 2 ? "01" : base === 16 ? "0-9a-fA-F" : "0-9";
  return new RegExp(`^[${digits}]+$`).test(value.trim());
}

export default function BaseConverterFields({ accent }: BaseConverterFieldsProps) {
  const [value, setValue] = useState("10");
  const [fromBase, setFromBase] = useState(10);
  const [toBase, setToBase] = useState(2);

  const result = useMemo(() => {
    if (!isValidForBase(value, fromBase)) return null;
    const parsed = parseInt(value, fromBase);
    if (Number.isNaN(parsed)) return null;
    return parsed.toString(toBase).toUpperCase();
  }, [value, fromBase, toBase]);

  function swap() {
    setFromBase(toBase);
    setToBase(fromBase);
    if (result !== null) setValue(result);
  }

  return (
    <>
      <div className="rounded-2xl border border-white/60 bg-white/45 px-4 py-4">
        <label
          htmlFor="base-from-unit"
          className="block text-right text-xs font-medium text-slate-500"
        >
          בסיס מקור
        </label>
        <select
          id="base-from-unit"
          aria-label="בסיס מקור"
          value={fromBase}
          onChange={(e) => setFromBase(Number(e.target.value))}
          className="mt-1 w-full rounded-xl border border-slate-300/60 bg-white/60 px-3 py-2 text-right font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
        >
          {BASES.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          inputMode="text"
          dir="ltr"
          aria-label="ערך להמרה"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-3 w-full bg-transparent text-left text-[30px] font-bold text-slate-800 focus:outline-none"
        />
      </div>

      <div className="-my-3 flex justify-center">
        <button
          type="button"
          onClick={swap}
          aria-label="החלף בסיסים"
          className="z-10 flex size-11 items-center justify-center rounded-full text-white transition active:scale-90"
          style={{
            background: `linear-gradient(135deg, ${accent}, #2F6FED)`,
            boxShadow: `0 0 16px ${accent}99`,
          }}
        >
          <ArrowLeftRight className="size-5" strokeWidth={2.5} />
        </button>
      </div>

      <div
        className="rounded-2xl bg-white/45 px-4 py-4"
        style={{ border: `1.5px solid ${accent}99` }}
      >
        <label
          htmlFor="base-to-unit"
          className="block text-right text-xs font-medium text-slate-500"
        >
          בסיס יעד
        </label>
        <select
          id="base-to-unit"
          aria-label="בסיס יעד"
          value={toBase}
          onChange={(e) => setToBase(Number(e.target.value))}
          className="mt-1 w-full rounded-xl border border-slate-300/60 bg-white/60 px-3 py-2 text-right font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
        >
          {BASES.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
        <p dir="ltr" className="mt-3 text-left text-[30px] font-bold text-slate-800">
          {result === null ? "—" : result}
        </p>
      </div>
    </>
  );
}
