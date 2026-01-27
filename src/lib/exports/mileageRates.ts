export function getStandardMileageRate(taxYear: number): number {
  const byYear: Record<number, number> = {
    2023: 0.655,
    2024: 0.67,
    2025: 0.67,
  };

  return byYear[taxYear] ?? 0.67;
}
