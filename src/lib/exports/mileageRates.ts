export function getStandardMileageRate(taxYear: number): number {
  const byYear: Record<number, number> = {
    2023: 0.655,
    2024: 0.67,
    2025: 0.70,
  };

  return byYear[taxYear] ?? byYear[2025];
}
