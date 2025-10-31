/**
 * Schedule C Category Mapper
 * Maps expense categories to IRS Schedule C line items
 * Reference: https://www.irs.gov/forms-pubs/about-schedule-c-form-1040
 */

export type ScheduleCLine = {
  lineNumber: string;
  lineName: string;
  description: string;
  deductionRate: number; // 1.0 = 100%, 0.5 = 50%
};

export const SCHEDULE_C_LINES: Record<string, ScheduleCLine> = {
  'Advertising': {
    lineNumber: '8',
    lineName: 'Advertising',
    description: 'Marketing, promotional materials, online ads',
    deductionRate: 1.0,
  },
  'Car and Truck Expenses': {
    lineNumber: '9',
    lineName: 'Car and Truck Expenses',
    description: 'Business mileage (standard mileage rate)',
    deductionRate: 1.0,
  },
  'Depreciation': {
    lineNumber: '13',
    lineName: 'Depreciation',
    description: 'Equipment, instruments, computers',
    deductionRate: 1.0,
  },
  'Education and Training': {
    lineNumber: '27a',
    lineName: 'Other Expenses',
    description: 'Professional development, lessons, workshops',
    deductionRate: 1.0,
  },
  'Legal and Professional Services': {
    lineNumber: '17',
    lineName: 'Legal and Professional Services',
    description: 'Accountant, lawyer, agent fees',
    deductionRate: 1.0,
  },
  'Meals and Entertainment': {
    lineNumber: '24b',
    lineName: 'Meals',
    description: 'Business meals (50% deductible)',
    deductionRate: 0.5,
  },
  'Office Expense': {
    lineNumber: '18',
    lineName: 'Office Expense',
    description: 'Software, subscriptions, office supplies',
    deductionRate: 1.0,
  },
  'Rent or Lease': {
    lineNumber: '20a',
    lineName: 'Rent or Lease (Vehicles, Machinery, Equipment)',
    description: 'Studio rent, equipment rental, storage',
    deductionRate: 1.0,
  },
  'Supplies': {
    lineNumber: '22',
    lineName: 'Supplies',
    description: 'Strings, reeds, cables, music supplies',
    deductionRate: 1.0,
  },
  'Travel': {
    lineNumber: '24a',
    lineName: 'Travel',
    description: 'Airfare, hotels, transportation (excluding meals)',
    deductionRate: 1.0,
  },
  'Other Expenses': {
    lineNumber: '27a',
    lineName: 'Other Expenses',
    description: 'Miscellaneous business expenses',
    deductionRate: 1.0,
  },
};

/**
 * Maps an expense category to a Schedule C line
 */
export function mapCategoryToScheduleC(category: string): ScheduleCLine {
  const mapping: Record<string, string> = {
    'Travel': 'Travel',
    'Meals': 'Meals and Entertainment',
    'Lodging': 'Travel',
    'Supplies': 'Supplies',
    'Marketing': 'Advertising',
    'Education': 'Education and Training',
    'Software': 'Office Expense',
    'Fees': 'Legal and Professional Services',
    'Equipment': 'Depreciation',
    'Rent': 'Rent or Lease',
    'Other': 'Other Expenses',
  };

  const scheduleCKey = mapping[category] || 'Other Expenses';
  return SCHEDULE_C_LINES[scheduleCKey];
}

/**
 * Calculates the deductible amount for an expense
 */
export function calculateDeductibleAmount(category: string, amount: number): number {
  const scheduleC = mapCategoryToScheduleC(category);
  return Math.round(amount * scheduleC.deductionRate * 100) / 100;
}

/**
 * Groups expenses by Schedule C line and calculates totals
 */
export function groupExpensesByScheduleC(
  expenses: Array<{ category: string; amount: number }>
): Record<string, { line: ScheduleCLine; total: number }> {
  const grouped: Record<string, { line: ScheduleCLine; total: number }> = {};

  for (const expense of expenses) {
    const line = mapCategoryToScheduleC(expense.category);
    const deductibleAmount = calculateDeductibleAmount(expense.category, expense.amount);

    if (!grouped[line.lineName]) {
      grouped[line.lineName] = {
        line,
        total: 0,
      };
    }

    grouped[line.lineName].total += deductibleAmount;
  }

  // Round all totals to 2 decimal places
  Object.keys(grouped).forEach((key) => {
    grouped[key].total = Math.round(grouped[key].total * 100) / 100;
  });

  return grouped;
}

/**
 * IRS standard mileage rate (updated annually)
 */
export const IRS_MILEAGE_RATE = {
  2024: 0.67,
  2023: 0.655,
  2022: 0.625,
};

/**
 * Gets the IRS mileage rate for a given year
 */
export function getMileageRate(year: number): number {
  return IRS_MILEAGE_RATE[year as keyof typeof IRS_MILEAGE_RATE] || IRS_MILEAGE_RATE[2024];
}

/**
 * Calculates mileage deduction
 */
export function calculateMileageDeduction(miles: number, year: number): number {
  const rate = getMileageRate(year);
  return Math.round(miles * rate * 100) / 100;
}
