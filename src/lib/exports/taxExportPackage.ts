export type TaxExportBasis = 'cash';

export type TaxExportCurrency = 'USD';

export type TaxExportSchemaVersion = '2026-01-26.1';

export type ScheduleCRefNumber =
  | 293
  | 296
  | 295
  | 304
  | 305
  | 306
  | 307
  | 685
  | 298
  | 299
  | 300
  | 301
  | 313
  | 308
  | 310
  | 311
  | 312
  | 314
  | 315
  | 316
  | 317
  | 294
  | 318
  | 303
  | 302
  | 319;

export interface TaxExportMetadata {
  taxYear: number;
  dateStart: string;
  dateEnd: string;
  createdAt: string;
  timezone: string;
  basis: TaxExportBasis;
  currency: TaxExportCurrency;
  rounding: {
    mode: 'half_away_from_zero';
    precision: 2;
  };
  schemaVersion: TaxExportSchemaVersion;
}

export interface ScheduleCOtherExpenseItem {
  name: string;
  amount: number;
}

export interface ScheduleCSection {
  grossReceipts: number;
  returnsAllowances: number;
  cogs: number;
  otherIncome: number;
  expenseTotalsByScheduleCRefNumber: Partial<Record<ScheduleCRefNumber, number>>;
  otherExpensesBreakdown: ScheduleCOtherExpenseItem[];
  netProfit: number;
  warnings: string[];
}

export interface IncomeRow {
  id: string;
  source: 'gig' | 'invoice_payment';
  receivedDate: string;
  payerId?: string | null;
  payerName?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;
  description: string;
  amount: number;
  fees: number;
  netAmount: number;
  currency: TaxExportCurrency;
  relatedInvoiceId?: string | null;
  relatedGigId?: string | null;
}

export interface ExpenseRow {
  id: string;
  date: string;
  merchant?: string | null;
  description: string;
  amount: number;
  glCategory: string;
  scheduleCRefNumber: ScheduleCRefNumber;
  deductiblePercent: number;
  deductibleAmount: number;
  currency: TaxExportCurrency;
  receiptUrl?: string | null;
  notes?: string | null;
  relatedGigId?: string | null;
  potentialAssetReview: boolean;
  potentialAssetReason?: string | null;
}

export interface MileageRow {
  id: string;
  date: string;
  origin?: string | null;
  destination?: string | null;
  purpose?: string | null;
  miles: number;
  rate: number;
  deductionAmount: number;
  currency: TaxExportCurrency;
  isEstimate: boolean;
  notes?: string | null;
  relatedGigId?: string | null;
}

export interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  clientName: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  currency: string;
}

export interface SubcontractorPayoutRow {
  id: string;
  gigId: string;
  subcontractorId: string;
  subcontractorName?: string | null;
  amount: number;
  note?: string | null;
  createdAt: string;
}

export interface ReceiptsManifestItem {
  transactionId: string;
  receiptUrl: string;
  kind: 'expense';
}

export interface PayerSummaryRow {
  payerId: string | null;
  payerName: string | null;
  payerEmail: string | null;
  payerPhone: string | null;
  paymentsCount: number;
  grossAmount: number;
  feesTotal: number;
  netAmount: number;
  firstPaymentDate: string;
  lastPaymentDate: string;
  notes: string | null;
}

export interface MileageSummary {
  taxYear: number;
  totalBusinessMiles: number;
  standardRateUsed: number;
  mileageDeductionAmount: number;
  entriesCount: number;
  isEstimateAny: boolean;
  notes: string;
}

export interface ScheduleCLineItem {
  scheduleCRefNumber: ScheduleCRefNumber;
  scheduleCLineName: string;
  lineDescription: string;
  rawSignedAmount: number;
  amountForEntry: number;
  notes: string | null;
}

export interface TaxExportPackage {
  metadata: TaxExportMetadata;
  scheduleC: ScheduleCSection;
  scheduleCLineItems: ScheduleCLineItem[];
  incomeRows: IncomeRow[];
  expenseRows: ExpenseRow[];
  mileageRows: MileageRow[];
  invoiceRows: InvoiceRow[];
  subcontractorPayoutRows: SubcontractorPayoutRow[];
  receiptsManifest: ReceiptsManifestItem[];
  payerSummaryRows: PayerSummaryRow[];
  mileageSummary: MileageSummary;
}
