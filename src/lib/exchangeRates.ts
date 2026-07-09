const FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest?from=USD";

let ratesCache: Record<string, number> | null = null;
let ratesPromise: Promise<Record<string, number>> | null = null;

export function fetchExchangeRates(): Promise<Record<string, number>> {
  if (ratesCache) return Promise.resolve(ratesCache);
  if (!ratesPromise) {
    ratesPromise = fetch(FRANKFURTER_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch exchange rates");
        return res.json() as Promise<{ rates: Record<string, number> }>;
      })
      .then((data) => {
        ratesCache = { USD: 1, ...data.rates };
        return ratesCache;
      })
      .catch((error: unknown) => {
        ratesPromise = null;
        throw error;
      });
  }
  return ratesPromise;
}

export function getCachedExchangeRates(): Record<string, number> | null {
  return ratesCache;
}
