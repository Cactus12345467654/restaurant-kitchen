import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resolves a menu item image URL to an absolute URL ready for <img src>.
 * Accepts any object that may have `imageUrl` or `image_url` (covers both
 * camelCase API responses and possible snake_case variants).
 * Returns `null` when no image is available.
 */
export function resolveImageUrl(
  item: { imageUrl?: string | null; image_url?: string | null } | null | undefined,
): string | null {
  if (!item) return null;
  const raw = item.imageUrl ?? item.image_url;
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return window.location.origin + raw;
  return raw;
}
