import { useQuery } from '@tanstack/react-query';
import { buildTaxExportPackage, TaxExportError } from '../lib/exports/buildTaxExportPackage';
import type { TaxExportPackage } from '../lib/exports/taxExportPackage';

export interface UseTaxExportPackageOptions {
  userId: string;
  taxYear: number;
  timezone?: string;
  includeTips?: boolean;
  includeFees?: boolean;
  dateStart?: string;
  dateEnd?: string;
  enabled?: boolean;
}

export function useTaxExportPackage(options: UseTaxExportPackageOptions) {
  const {
    userId,
    taxYear,
    timezone = 'America/New_York',
    includeTips = true,
    includeFees = true,
    dateStart,
    dateEnd,
    enabled = true,
  } = options;

  return useQuery<TaxExportPackage, TaxExportError>({
    queryKey: ['taxExportPackage', userId, taxYear, timezone, includeTips, includeFees, dateStart, dateEnd],
    queryFn: async () => {
      return await buildTaxExportPackage({
        userId,
        taxYear,
        timezone,
        basis: 'cash',
        includeTips,
        includeFeesAsDeduction: includeFees,
        dateStart,
        dateEnd,
      });
    },
    enabled: enabled && !!userId && !!taxYear,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}
