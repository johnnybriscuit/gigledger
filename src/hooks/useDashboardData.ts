import { useMemo } from 'react';
import { useGigs } from './useGigs';
import { useExpenses } from './useExpenses';
import { useMileage, calculateMileageDeduction } from './useMileage';
import { useTaxCalculation } from './useTaxCalculation';

export type DateRange = 'ytd' | 'last30' | 'last90' | 'lastYear' | 'custom';

export interface MonthlyPoint {
  month: string;
  income: number;
  expenses: number;
  taxes: number;
  net: number;
}

export interface ExpenseCategoryPoint {
  category: string;
  amount: number;
}

export interface IncomeBreakdown {
  gross: number;
  tips: number;
  perDiem: number;
  other: number;
}

export interface PayerBreakdown {
  payer: string;
  amount: number;
}

export interface DashboardData {
  monthly: MonthlyPoint[];
  cumulativeNet: { month: string; value: number }[];
  expenseBreakdown: ExpenseCategoryPoint[];
  incomeBreakdown: IncomeBreakdown;
  payerBreakdown: PayerBreakdown[];
  totals: {
    net: number;
    taxes: number;
    effectiveTaxRate: number;
  };
}

interface DateRangeConfig {
  startDate: Date;
  endDate: Date;
}

function getDateRangeConfig(range: DateRange, customStart?: Date, customEnd?: Date): DateRangeConfig {
  const now = new Date();
  const endDate = new Date(now);
  let startDate = new Date(now);

  switch (range) {
    case 'ytd':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'last30':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      break;
    case 'last90':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 90);
      break;
    case 'lastYear':
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate.setFullYear(now.getFullYear() - 1, 11, 31);
      break;
    case 'custom':
      if (customStart && customEnd) {
        startDate = customStart;
        endDate.setTime(customEnd.getTime());
      }
      break;
  }

  return { startDate, endDate };
}

function filterByDateRange<T extends { date?: string }>(
  items: T[] | undefined,
  startDate: Date,
  endDate: Date
): T[] {
  if (!items) return [];
  
  return items.filter((item) => {
    const dateStr = item.date;
    if (!dateStr) return false;
    
    const itemDate = new Date(dateStr);
    return itemDate >= startDate && itemDate <= endDate;
  });
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function useDashboardData(
  dateRange: DateRange = 'ytd',
  customStart?: Date,
  customEnd?: Date
): DashboardData {
  const { data: allGigs } = useGigs();
  const { data: allExpenses } = useExpenses();
  const { data: allMileage } = useMileage();

  // Calculate net profit first to get tax estimate
  const { netProfit, totalIncome, totalDeductions } = useMemo(() => {
    const { startDate, endDate } = getDateRangeConfig(dateRange, customStart, customEnd);
    const gigs = filterByDateRange(allGigs, startDate, endDate);
    const expenses = filterByDateRange(allExpenses, startDate, endDate);
    const mileage = filterByDateRange(allMileage, startDate, endDate);

    const totalGross = gigs.reduce((sum, gig) => sum + (gig.gross_amount || 0), 0);
    const totalTips = gigs.reduce((sum, gig) => sum + (gig.tips || 0), 0);
    const totalPerDiem = gigs.reduce((sum, gig) => sum + (gig.per_diem || 0), 0);
    const totalOtherIncome = gigs.reduce((sum, gig) => sum + (gig.other_income || 0), 0);
    const totalFees = gigs.reduce((sum, gig) => sum + (gig.fees || 0), 0);
    const totalIncome = totalGross + totalTips + totalPerDiem + totalOtherIncome - totalFees;

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalMiles = mileage.reduce((sum, m) => sum + m.miles, 0);
    const totalMileageDeduction = calculateMileageDeduction(totalMiles);
    const totalDeductions = totalExpenses + totalMileageDeduction;

    const netProfit = totalIncome - totalDeductions;

    return { netProfit, totalIncome, totalDeductions };
  }, [allGigs, allExpenses, allMileage, dateRange, customStart, customEnd]);

  // Calculate taxes using new tax engine (must be called at top level)
  const { taxResult } = useTaxCalculation(netProfit, totalIncome);
  const totalTaxes = taxResult?.total || 0;
  const effectiveTaxRate = netProfit > 0 ? (totalTaxes / netProfit) * 100 : 0;

  const data = useMemo(() => {
    const { startDate, endDate } = getDateRangeConfig(dateRange, customStart, customEnd);

    // Filter data by date range
    const gigs = filterByDateRange(allGigs, startDate, endDate);
    const expenses = filterByDateRange(allExpenses, startDate, endDate);
    const mileage = filterByDateRange(allMileage, startDate, endDate);

    // Calculate totals
    const totalGross = gigs.reduce((sum, gig) => sum + (gig.gross_amount || 0), 0);
    const totalTips = gigs.reduce((sum, gig) => sum + (gig.tips || 0), 0);
    const totalPerDiem = gigs.reduce((sum, gig) => sum + (gig.per_diem || 0), 0);
    const totalOtherIncome = gigs.reduce((sum, gig) => sum + (gig.other_income || 0), 0);
    const totalFees = gigs.reduce((sum, gig) => sum + (gig.fees || 0), 0);

    // Income breakdown
    const incomeBreakdown: IncomeBreakdown = {
      gross: totalGross,
      tips: totalTips,
      perDiem: totalPerDiem,
      other: totalOtherIncome - totalFees,
    };

    // Group by month
    const monthlyMap = new Map<string, MonthlyPoint>();

    // Initialize months in range
    const currentMonth = new Date(startDate);
    while (currentMonth <= endDate) {
      const key = getMonthKey(currentMonth);
      monthlyMap.set(key, {
        month: formatMonthLabel(key),
        income: 0,
        expenses: 0,
        taxes: 0,
        net: 0,
      });
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Aggregate gigs by month
    gigs.forEach((gig) => {
      const gigDate = new Date(gig.date || '');
      const key = getMonthKey(gigDate);
      const point = monthlyMap.get(key);
      if (point) {
        const gigIncome =
          (gig.gross_amount || 0) +
          (gig.tips || 0) +
          (gig.per_diem || 0) +
          (gig.other_income || 0) -
          (gig.fees || 0);
        point.income += gigIncome;
      }
    });

    // Aggregate expenses by month
    expenses.forEach((exp) => {
      const expDate = new Date(exp.date || '');
      const key = getMonthKey(expDate);
      const point = monthlyMap.get(key);
      if (point) {
        point.expenses += exp.amount;
      }
    });

    // Aggregate mileage by month
    mileage.forEach((m) => {
      const mileageDate = new Date(m.date || '');
      const key = getMonthKey(mileageDate);
      const point = monthlyMap.get(key);
      if (point) {
        point.expenses += calculateMileageDeduction(m.miles);
      }
    });

    // Calculate taxes per month proportional to income
    monthlyMap.forEach((point) => {
      if (totalIncome > 0) {
        point.taxes = (point.income / totalIncome) * totalTaxes;
      }
      point.net = point.income - point.expenses - point.taxes;
    });

    const monthly = Array.from(monthlyMap.values());

    // Calculate cumulative net
    let cumulative = 0;
    const cumulativeNet = monthly.map((point) => {
      cumulative += point.net;
      return {
        month: point.month,
        value: cumulative,
      };
    });

    // Expense breakdown by category
    const categoryMap = new Map<string, number>();
    expenses.forEach((exp) => {
      const category = exp.category || 'Other';
      categoryMap.set(category, (categoryMap.get(category) || 0) + exp.amount);
    });

    // Add mileage as a category
    const totalMiles = mileage.reduce((sum, m) => sum + m.miles, 0);
    const mileageDeduction = calculateMileageDeduction(totalMiles);
    if (mileageDeduction > 0) {
      categoryMap.set('Mileage', mileageDeduction);
    }

    // Sort and get top 8 + Other
    const sortedCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount }));

    let expenseBreakdown: ExpenseCategoryPoint[];
    if (sortedCategories.length > 8) {
      const top8 = sortedCategories.slice(0, 8);
      const otherAmount = sortedCategories.slice(8).reduce((sum, cat) => sum + cat.amount, 0);
      expenseBreakdown = [...top8, { category: 'Other', amount: otherAmount }];
    } else {
      expenseBreakdown = sortedCategories;
    }

    // Payer breakdown - aggregate income by payer
    const payerMap = new Map<string, number>();
    gigs.forEach((gig) => {
      const payerName = gig.payer?.name || 'Unknown';
      const gigIncome =
        (gig.gross_amount || 0) +
        (gig.tips || 0) +
        (gig.per_diem || 0) +
        (gig.other_income || 0) -
        (gig.fees || 0);
      payerMap.set(payerName, (payerMap.get(payerName) || 0) + gigIncome);
    });

    // Sort payers by total income and get top 8 + Other
    const sortedPayers = Array.from(payerMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([payer, amount]) => ({ payer, amount }));

    let payerBreakdown: PayerBreakdown[];
    if (sortedPayers.length > 8) {
      const top8 = sortedPayers.slice(0, 8);
      const otherAmount = sortedPayers.slice(8).reduce((sum, p) => sum + p.amount, 0);
      payerBreakdown = [...top8, { payer: 'Other', amount: otherAmount }];
    } else {
      payerBreakdown = sortedPayers;
    }

    return {
      monthly,
      cumulativeNet,
      expenseBreakdown,
      incomeBreakdown,
      payerBreakdown,
      totals: {
        net: netProfit,
        taxes: totalTaxes,
        effectiveTaxRate,
      },
    };
  }, [allGigs, allExpenses, allMileage, dateRange, customStart, customEnd, netProfit, totalTaxes, effectiveTaxRate]);

  return data;
}
