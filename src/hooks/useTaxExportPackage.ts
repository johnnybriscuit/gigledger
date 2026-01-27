import { useQuery } from '@tanstack/react-query';
import { buildTaxExportPackage, TaxExportError } from '../lib/exports/buildTaxExportPackage';
import type { TaxExportPackage } from '../lib/exports/taxExportPackage';

export interface UseTaxExportPackageOptions {
  userId: string;
  taxYear: number;
  timezone?: string;
  enabled?: boolean;
}

export function useTaxExportPackage(options: UseTaxExportPackageOptions) {
  const { userId, taxYear, timezone = 'America/New_York', enabled = true } = options;

  return useQuery<TaxExportPackage, TaxExportError>({
    queryKey: ['taxExportPackage', userId, taxYear, timezone],
    queryFn: async () => {
      return await buildTaxExportPackage({
        userId,
        taxYear,
        timezone,
        basis: 'cash',
        includeTips: true,
        includeFeesAsDeduction: true,
      });
    },
    enabled: enabled && !!userId && !!taxYear,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}
