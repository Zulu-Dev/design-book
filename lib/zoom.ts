const ZOOM_KEY = "design-book-zoom";
export const ZOOM_LEVELS = [1.5, 2] as const;
export type ZoomLevel = (typeof ZOOM_LEVELS)[number];
const DEFAULT: ZoomLevel = 1.5;

export function getStoredZoom(): ZoomLevel {
  if (typeof window === "undefined") return DEFAULT;
  const raw = localStorage.getItem(ZOOM_KEY);
  const n = raw ? Number.parseFloat(raw) : DEFAULT;
  if (n >= 1.75) return 2;
  return 1.5;
}

export function setStoredZoom(value: ZoomLevel): void {
  localStorage.setItem(ZOOM_KEY, String(value));
}

export function zoomLabel(level: ZoomLevel): string {
  return level === 2 ? "100%" : "50%";
}
