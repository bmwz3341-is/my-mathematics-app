"use client";

import { useMemo, useState } from "react";

export const VOLUME_UNITS_TO_LITER: Record<string, number> = {
  ml: 1000,
  l: 1,
  m3: 0.001,
  cup: 1 / 0.24,
  gal: 1 / 3.785411784,
};

export const VOLUME_UNIT_LABELS: Record<string, string> = {
  ml: "מ״ל",
  l: "ליטר",
  m3: "מ״ק",
  cup: "כוס",
  gal: "גלון",
};

export function useVolumeConverter() {
  const [value, setValue] = useState("1");
  const [fromUnit, setFromUnit] = useState("l");
  const [toUnit, setToUnit] = useState("ml");

  const result = useMemo(() => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return 0;
    const liters = numericValue / VOLUME_UNITS_TO_LITER[fromUnit];
    return liters * VOLUME_UNITS_TO_LITER[toUnit];
  }, [value, fromUnit, toUnit]);

  return { value, setValue, fromUnit, setFromUnit, toUnit, setToUnit, result };
}
