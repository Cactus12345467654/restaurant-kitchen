import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resolves a menu-item image field to a URL usable in <img src>.
 * Handles both camelCase (`imageUrl`) and snake_case (`image_url`) API shapes.
 * Returns `null` when no image is available.
 */
/** Get initials from username (e.g. "janis.berzins@email.com" → "JB"). */
export function getInitials(username: string): string {
  const part = (username.split("@")[0] || username).replace(/\./g, " ");
  const letters = part.split(/\s+/).map((w) => w.charAt(0).toUpperCase()).filter(Boolean);
  return letters.length > 0 ? letters.join("") : "?";
}

export function resolveImageUrl(
  item: { imageUrl?: string | null; image_url?: string | null } | null | undefined,
): string | null {
  if (!item) return null;
  const raw = (item as any).imageUrl ?? (item as any).image_url;
  if (!raw || typeof raw !== "string") return null;
  return raw;
}
