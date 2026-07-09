"use client";

import {
  LENGTH_UNIT_LABELS,
  useLengthConverter,
} from "@/hooks/useLengthConverter";
import ConverterCard from "@/components/layout/ConverterCard";

export default function LengthConverter() {
  const { value, setValue, fromUnit, setFromUnit, toUnit, setToUnit, result } =
    useLengthConverter();

  return (
    <ConverterCard accentColor="bg-green-300">
      <div className="text-right">
        <h2 className="text-xl font-bold text-blue-800">המרת אורך</h2>

        <input
          type="number"
          aria-label="ערך להמרה"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-4 w-full rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-right text-lg font-bold text-black focus:outline-none"
        />

        <div className="mt-4 flex flex-row-reverse gap-4">
          <select
            aria-label="יחידת מקור"
            value={fromUnit}
            onChange={(e) => setFromUnit(e.target.value)}
            className="flex-1 rounded-xl border-2 border-blue-200 bg-blue-50 px-3 py-2 text-right font-bold text-black focus:outline-none"
          >
            {Object.entries(LENGTH_UNIT_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>

          <select
            aria-label="יחידת יעד"
            value={toUnit}
            onChange={(e) => setToUnit(e.target.value)}
            className="flex-1 rounded-xl border-2 border-blue-200 bg-blue-50 px-3 py-2 text-right font-bold text-black focus:outline-none"
          >
            {Object.entries(LENGTH_UNIT_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 rounded-xl bg-blue-50 px-4 py-3 text-lg font-bold text-blue-600">
          {result} {LENGTH_UNIT_LABELS[toUnit]}
        </div>
      </div>
    </ConverterCard>
  );
}
