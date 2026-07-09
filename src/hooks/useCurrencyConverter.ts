"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchExchangeRates, getCachedExchangeRates } from "@/lib/exchangeRates";

export function useCurrencyConverter() {
  const cached = getCachedExchangeRates();
  const [rates, setRates] = useState<Record<string, number> | null>(cached);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("1");
  const [fromUnit, setFromUnit] = useState("USD");
  const [toUnit, setToUnit] = useState("ILS");

  useEffect(() => {
    const cachedNow = getCachedExchangeRates();
    if (cachedNow) {
      setRates(cachedNow);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchExchangeRates()
      .then((data) => {
        if (!cancelled) setRates(data);
      })
      .catch(() => {
        if (!cancelled) setError("לא ניתן לטעון שערי חליפין כרגע");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function swap() {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  }

  const result = useMemo(() => {
    if (!rates) return null;
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return null;
    const fromRate = rates[fromUnit];
    const toRate = rates[toUnit];
    if (!fromRate || !toRate) return null;
    return (numericValue / fromRate) * toRate;
  }, [rates, value, fromUnit, toUnit]);

  return {
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
  };
}
