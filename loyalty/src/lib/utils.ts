import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format points number for display: 1000 → "1 000" */
export function formatPoints(pts: number): string {
  return pts.toLocaleString("lv-LV");
}
