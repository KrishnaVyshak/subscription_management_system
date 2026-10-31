import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Join class names; later Tailwind classes win over earlier conflicting ones.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
