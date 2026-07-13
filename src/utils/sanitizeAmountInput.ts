/**
 * Sanitizes free-typed currency input: strips non-numeric characters,
 * collapses to a single decimal point, caps at 2 decimal places, and
 * strips leading zeros (e.g. "007" -> "7", "038.399" -> "38.39").
 */
export function sanitizeAmountInput(text: string): string {
  let cleaned = text.replace(/[^0-9.]/g, '');

  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }

  const [rawIntPart, rawDecPart] = cleaned.split('.');
  const hasDecimal = cleaned.includes('.');
  let intPart = rawIntPart ?? '';

  if (intPart.length > 1) {
    intPart = intPart.replace(/^0+/, '') || '0';
  }

  if (!hasDecimal) {
    return intPart;
  }

  const decPart = (rawDecPart ?? '').slice(0, 2);
  return `${intPart}.${decPart}`;
}
