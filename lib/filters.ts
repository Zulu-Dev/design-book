const LATEST_ONLY_KEY = "design-book-latest-only";

export function getStoredLatestOnly(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LATEST_ONLY_KEY) === "true";
}

export function setStoredLatestOnly(latestOnly: boolean): void {
  localStorage.setItem(LATEST_ONLY_KEY, String(latestOnly));
}
