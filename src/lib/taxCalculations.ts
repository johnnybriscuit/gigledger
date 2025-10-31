// Tax calculation utilities for self-employed/1099 workers

// Default tax rates (can be customized per user in the future)
export const DEFAULT_FEDERAL_SELF_EMPLOYMENT_TAX = 0.153; // 15.3% (Social Security + Medicare)
export const DEFAULT_FEDERAL_INCOME_TAX = 0.22; // Estimated 22% bracket for self-employed
export const DEFAULT_STATE_TAX = 0.05; // 5% average state income tax

// State-specific income tax rates (simplified - actual rates vary by bracket)
export const STATE_TAX_RATES: Record<string, number> = {
  // No income tax states
  'AK': 0, 'FL': 0, 'NV': 0, 'SD': 0, 'TN': 0, 'TX': 0, 'WA': 0, 'WY': 0,
  // Low tax states
  'AZ': 0.025, 'CO': 0.044, 'IL': 0.0495, 'IN': 0.0323, 'KY': 0.045,
  'MI': 0.0425, 'MS': 0.05, 'NC': 0.0499, 'ND': 0.029, 'OH': 0.0399,
  'OK': 0.05, 'PA': 0.0307, 'UT': 0.0495,
  // Medium tax states
  'AL': 0.05, 'AR': 0.059, 'CT': 0.05, 'DE': 0.066, 'GA': 0.0575,
  'HI': 0.08, 'IA': 0.06, 'ID': 0.06, 'KS': 0.057, 'LA': 0.0425,
  'MA': 0.05, 'MD': 0.0575, 'ME': 0.0715, 'MN': 0.0985, 'MO': 0.054,
  'MT': 0.0675, 'NE': 0.0684, 'NH': 0, 'NJ': 0.0897, 'NM': 0.059,
  'NY': 0.0882, 'OR': 0.099, 'RI': 0.0599, 'SC': 0.07, 'VT': 0.0875,
  'VA': 0.0575, 'WV': 0.065, 'WI': 0.0765,
  // High tax states
  'CA': 0.093, 'DC': 0.0895,
};

export interface TaxSettings {
  federalIncomeTaxRate?: number;
  stateTaxRate?: number;
  stateCode?: string;
  selfEmploymentTaxRate?: number;
}

/**
 * Calculate estimated taxes to set aside for a gig
 * @param income - Gross income from the gig
 * @param settings - Optional tax settings (uses defaults if not provided)
 * @returns Object with tax breakdown
 */
export function calculateTaxesForIncome(
  income: number,
  settings?: TaxSettings
): {
  selfEmploymentTax: number;
  federalIncomeTax: number;
  stateTax: number;
  totalTax: number;
  effectiveRate: number;
} {
  if (income <= 0) {
    return {
      selfEmploymentTax: 0,
      federalIncomeTax: 0,
      stateTax: 0,
      totalTax: 0,
      effectiveRate: 0,
    };
  }

  // Get tax rates
  const selfEmploymentRate = settings?.selfEmploymentTaxRate ?? DEFAULT_FEDERAL_SELF_EMPLOYMENT_TAX;
  const federalIncomeRate = settings?.federalIncomeTaxRate ?? DEFAULT_FEDERAL_INCOME_TAX;
  
  // Determine state tax rate
  let stateRate = settings?.stateTaxRate ?? DEFAULT_STATE_TAX;
  if (settings?.stateCode && STATE_TAX_RATES[settings.stateCode] !== undefined) {
    stateRate = STATE_TAX_RATES[settings.stateCode];
  }

  // Calculate taxes
  // Self-employment tax is on 92.35% of net earnings (per IRS)
  const selfEmploymentTax = income * 0.9235 * selfEmploymentRate;
  
  // Federal income tax (simplified - doesn't account for deductions)
  const federalIncomeTax = income * federalIncomeRate;
  
  // State income tax
  const stateTax = income * stateRate;
  
  // Total
  const totalTax = selfEmploymentTax + federalIncomeTax + stateTax;
  const effectiveRate = totalTax / income;

  return {
    selfEmploymentTax,
    federalIncomeTax,
    stateTax,
    totalTax,
    effectiveRate,
  };
}

/**
 * Calculate recommended tax withholding percentage
 * @param settings - Tax settings
 * @returns Recommended percentage to set aside (0-1)
 */
export function getRecommendedTaxRate(settings?: TaxSettings): number {
  const selfEmploymentRate = settings?.selfEmploymentTaxRate ?? DEFAULT_FEDERAL_SELF_EMPLOYMENT_TAX;
  const federalIncomeRate = settings?.federalIncomeTaxRate ?? DEFAULT_FEDERAL_INCOME_TAX;
  
  let stateRate = settings?.stateTaxRate ?? DEFAULT_STATE_TAX;
  if (settings?.stateCode && STATE_TAX_RATES[settings.stateCode] !== undefined) {
    stateRate = STATE_TAX_RATES[settings.stateCode];
  }

  // Self-employment tax on 92.35% of income
  const effectiveSelfEmploymentRate = selfEmploymentRate * 0.9235;
  
  return effectiveSelfEmploymentRate + federalIncomeRate + stateRate;
}

/**
 * Format tax rate as percentage
 */
export function formatTaxRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
