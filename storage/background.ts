export const backgroundStorageKey = "spriteEditor.background";

export function getBackgroundColor(): number {
  const stored = localStorage.getItem(backgroundStorageKey);
  if (stored === null) return 255;
  const parsed = Number(stored);
  return Number.isFinite(parsed) ? parsed : 255;
}

export function setBackgroundColor(gray: number): void {
  localStorage.setItem(backgroundStorageKey, String(gray));
}
