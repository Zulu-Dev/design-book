export type VoterName = "Ryan" | "Jackson";

const STORAGE_KEY = "design-book-voter";

export function getStoredVoter(): VoterName | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === "Ryan" || value === "Jackson") return value;
  return null;
}

export function setStoredVoter(voter: VoterName): void {
  localStorage.setItem(STORAGE_KEY, voter);
}

export function clearStoredVoter(): void {
  localStorage.removeItem(STORAGE_KEY);
}
