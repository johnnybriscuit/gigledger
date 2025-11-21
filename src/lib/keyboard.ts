/**
 * Shared keyboard utilities for autocomplete components
 * Ensures consistent free-typing behavior across all inputs
 */

export const isPrintableKey = (e: KeyboardEvent | React.KeyboardEvent): boolean => {
  // Treat single-length keys as printable (letters, numbers, punctuation, Space)
  if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    return true;
  }
  // Some browsers report Space as 'Spacebar'
  if (e.key === ' ' || e.key === 'Spacebar') {
    return true;
  }
  return false;
};

export const isNavKey = (k: string): boolean => {
  return k === 'ArrowDown' || k === 'ArrowUp';
};

export const isCloseKey = (k: string): boolean => {
  return k === 'Escape' || k === 'Tab';
};
