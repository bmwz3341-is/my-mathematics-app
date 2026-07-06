"use client";

import { useMemo, useState } from "react";

export const TEMPERATURE_UNIT_LABELS: Record<string, string> = {
  c: "צלזיוס (°C)",
  f: "פרנהייט (°F)",
  k: "קלווין (K)",
};

function toCelsius(value: number, unit: string): number {
  switch (unit) {
    case "f":
      return ((value - 32) * 5) / 9;
    case "k":
      return value - 273.15;
    default:
      return value;
  }
}

function fromCelsius(celsius: number, unit: string): number {
  switch (unit) {
    case "f":
      return (celsius * 9) / 5 + 32;
    case "k":
      return celsius + 273.15;
    default:
      return celsius;
  }
}

export function useTemperatureConverter() {
  const [value, setValue] = useState("0");
  const [fromUnit, setFromUnit] = useState("c");
  const [toUnit, setToUnit] = useState("f");

  const result = useMemo(() => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return 0;
    const celsius = toCelsius(numericValue, fromUnit);
    return fromCelsius(celsius, toUnit);
  }, [value, fromUnit, toUnit]);

  return { value, setValue, fromUnit, setFromUnit, toUnit, setToUnit, result };
}
