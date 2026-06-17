const LOT_FILTER_KEY = "design-book-lot-filter";
const LATEST_ONLY_KEY = "design-book-latest-only";

export function getStoredLotFilter(): string | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(LOT_FILTER_KEY);
  return value || null;
}

export function setStoredLotFilter(lotId: string | null): void {
  if (lotId) {
    localStorage.setItem(LOT_FILTER_KEY, lotId);
  } else {
    localStorage.removeItem(LOT_FILTER_KEY);
  }
}

export function getStoredLatestOnly(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LATEST_ONLY_KEY) === "true";
}

export function setStoredLatestOnly(latestOnly: boolean): void {
  localStorage.setItem(LATEST_ONLY_KEY, String(latestOnly));
}
