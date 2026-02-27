import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate age in years from a given date string or Date object.
 * Returns null if date is invalid or missing.
 */
export function calculateSkAge(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();

  // Adjust if current month is before birth month, or same month but day is before
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
    age--;
  }

  return age >= 0 ? age : 0;
}
