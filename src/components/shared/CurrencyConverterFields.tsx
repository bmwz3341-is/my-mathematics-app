"use client";

import { ArrowLeftRight } from "lucide-react";
import { currencies } from "@/data/currencies";
import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";

export interface CurrencyConverterFieldsProps {
  accent: string;
}

function flagCodeFor(code: string): string {
  return currencies.find((c) => c.code === code)?.flagCode ?? "";
}

export default function CurrencyConverterFields({ accent }: CurrencyConverterFieldsProps) {
  const {
    value,
    setValue,
    fromUnit,
    setFromUnit,
    toUnit,
    setToUnit,
    swap,
    result,
    isLoading,
    error,
  } = useCurrencyConverter();

  return (
    <>
      <p className="mb-2 text-right text-xs font-medium text-slate-500">
        {isLoading ? "טוען שער חליפין עדכני..." : error ? error : "לפי שער חליפין עדכני"}
      </p>

      <div className="rounded-2xl border border-white/60 bg-white/45 px-4 py-4">
        <label
          htmlFor="currency-from-unit"
          className="block text-right text-xs font-medium text-slate-500"
        >
          מטבע מקור
        </label>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`fi fi-${flagCodeFor(fromUnit)} rounded-sm text-lg shadow-sm`}
            aria-hidden="true"
          />
          <select
            id="currency-from-unit"
            aria-label="מטבע מקור"
            value={fromUnit}
            onChange={(e) => setFromUnit(e.target.value)}
            className="w-full rounded-xl border border-slate-300/60 bg-white/60 px-3 py-2 text-right font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
          >
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.flag} {currency.code} · {currency.name}
              </option>
            ))}
          </select>
        </div>
        <input
          type="number"
          inputMode="decimal"
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
          aria-label="החלף מטבעות"
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
          htmlFor="currency-to-unit"
          className="block text-right text-xs font-medium text-slate-500"
        >
          מטבע יעד
        </label>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`fi fi-${flagCodeFor(toUnit)} rounded-sm text-lg shadow-sm`}
            aria-hidden="true"
          />
          <select
            id="currency-to-unit"
            aria-label="מטבע יעד"
            value={toUnit}
            onChange={(e) => setToUnit(e.target.value)}
            className="w-full rounded-xl border border-slate-300/60 bg-white/60 px-3 py-2 text-right font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
          >
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.flag} {currency.code} · {currency.name}
              </option>
            ))}
          </select>
        </div>
        <p dir="ltr" className="mt-3 text-left text-[30px] font-bold text-slate-800">
          {result === null ? "—" : result.toLocaleString("he-IL", { maximumFractionDigits: 4 })}
        </p>
      </div>
    </>
  );
}
