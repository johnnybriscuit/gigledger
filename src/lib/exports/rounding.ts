export function roundCents(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  return sign * Math.round(abs * 100 + Number.EPSILON) / 100;
}

export function formatCents(value: number): string {
  return roundCents(value).toFixed(2);
}
