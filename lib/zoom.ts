const ZOOM_KEY = "design-book-zoom";
const MIN = 1.5;
const MAX = 4;
const DEFAULT = 2.5;

export function getStoredZoom(): number {
  if (typeof window === "undefined") return DEFAULT;
  const raw = localStorage.getItem(ZOOM_KEY);
  const n = raw ? Number.parseFloat(raw) : DEFAULT;
  if (Number.isNaN(n)) return DEFAULT;
  return Math.min(MAX, Math.max(MIN, n));
}

export function setStoredZoom(value: number): void {
  localStorage.setItem(ZOOM_KEY, String(Math.min(MAX, Math.max(MIN, value))));
}

export const ZOOM_MIN = MIN;
export const ZOOM_MAX = MAX;
