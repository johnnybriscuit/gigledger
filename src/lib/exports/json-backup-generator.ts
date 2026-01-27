import type { TaxExportPackage } from './taxExportPackage';

/**
 * JSON Backup Generator (from canonical TaxExportPackage)
 * Generates complete data backup in JSON format
 */

export function generateJSONBackup(pkg: TaxExportPackage): string {
  return JSON.stringify(pkg, null, 2);
}

export function downloadJSONBackup(pkg: TaxExportPackage): void {
  const jsonString = generateJSONBackup(pkg);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `GigLedger_Backup_${pkg.metadata.taxYear}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
