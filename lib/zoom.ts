const ZOOM_KEY = "design-book-zoom";
export const ZOOM_LEVELS = [2, 4] as const;
export type ZoomLevel = (typeof ZOOM_LEVELS)[number];
const DEFAULT: ZoomLevel = 2;

export function getStoredZoom(): ZoomLevel {
  if (typeof window === "undefined") return DEFAULT;
  const raw = localStorage.getItem(ZOOM_KEY);
  const n = raw ? Number.parseFloat(raw) : DEFAULT;
  if (n >= 3) return 4;
  return 2;
}

export function setStoredZoom(value: ZoomLevel): void {
  localStorage.setItem(ZOOM_KEY, String(value));
}

export function zoomLabel(level: ZoomLevel): string {
  return `${level}×`;
}
