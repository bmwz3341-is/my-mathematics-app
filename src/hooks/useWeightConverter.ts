"use client";

import { useMemo, useState } from "react";

export const WEIGHT_UNITS_TO_KG: Record<string, number> = {
  mg: 1000000,
  g: 1000,
  kg: 1,
  ton: 0.001,
  lb: 2.2046226218,
};

export const WEIGHT_UNIT_LABELS: Record<string, string> = {
  mg: "מ״ג",
  g: "גרם",
  kg: "ק״ג",
  ton: "טון",
  lb: "פאונד",
};

export function useWeightConverter() {
  const [value, setValue] = useState("1");
  const [fromUnit, setFromUnit] = useState("kg");
  const [toUnit, setToUnit] = useState("g");

  const result = useMemo(() => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return 0;
    const kg = numericValue / WEIGHT_UNITS_TO_KG[fromUnit];
    return kg * WEIGHT_UNITS_TO_KG[toUnit];
  }, [value, fromUnit, toUnit]);

  return { value, setValue, fromUnit, setFromUnit, toUnit, setToUnit, result };
}
