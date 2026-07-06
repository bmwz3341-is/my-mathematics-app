"use client";

import { useMemo, useState } from "react";

export const LENGTH_UNITS_TO_METER: Record<string, number> = {
  mm: 1000,
  cm: 100,
  m: 1,
  km: 0.001,
  in: 39.3701,
  ft: 3.28084,
  mi: 0.000621371,
};

export const LENGTH_UNIT_LABELS: Record<string, string> = {
  mm: "מ״מ",
  cm: "ס״מ",
  m: "מטר",
  km: "ק״מ",
  in: "אינץ'",
  ft: "רגל",
  mi: "מייל",
};

export function useLengthConverter() {
  const [value, setValue] = useState("1");
  const [fromUnit, setFromUnit] = useState("m");
  const [toUnit, setToUnit] = useState("cm");

  const result = useMemo(() => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return 0;
    const meters = numericValue / LENGTH_UNITS_TO_METER[fromUnit];
    return meters * LENGTH_UNITS_TO_METER[toUnit];
  }, [value, fromUnit, toUnit]);

  return { value, setValue, fromUnit, setFromUnit, toUnit, setToUnit, result };
}
