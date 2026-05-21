import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Standard shadcn-style class-name helper. Combines clsx (conditional class
 * lists, arrays, objects) with tailwind-merge (resolves conflicting Tailwind
 * utilities so `cn("p-2", isLarge && "p-4")` produces `p-4`, not both).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
