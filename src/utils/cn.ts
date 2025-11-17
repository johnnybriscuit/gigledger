/**
 * Class Name Utility
 * 
 * Combines class names with proper precedence and deduplication.
 * Uses clsx for conditional classes and tailwind-merge for Tailwind conflicts.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combine class names with Tailwind-aware merging
 * @example cn('px-2 py-1', 'px-4') => 'py-1 px-4'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
