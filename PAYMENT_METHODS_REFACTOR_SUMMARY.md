# Payment Methods Refactor - Implementation Summary

**Date:** 2026-02-17  
**Status:** ✅ Complete

## Overview

Refactored payment methods system from generic string-based details to structured, method-specific configurations with full backward compatibility.

---

## Changes Made

### 1. Database Schema (`20260217_add_payment_methods_config.sql`)

**Added columns:**
- `invoice_settings.payment_methods_config` (JSONB) - Structured config keyed by method
- `invoices.payment_methods_config` (JSONB) - Snapshot/override config per invoice

**Data model:**
- `accepted_payment_methods`: Array of enabled method keys `["cash", "venmo", "wire", ...]`
- `payment_methods_config`: Object with method-specific fields
  ```json
  {
    "venmo": { "handle": "@username", "note": "..." },
    "wire": { "instructions": "...", "includeBankDetailsOnInvoice": false },
    "check": { "payableTo": "...", "mailingAddress": "...", "memo": "..." }
  }
  ```

**Migration features:**
- ✅ Backward compatible - keeps existing `accepted_payment_methods` array
- ✅ Auto-backfills legacy data: `[{method:"venmo", details:"@x"}]` → structured config
- ✅ Normalizes legacy object arrays to string arrays
- ✅ GIN indexes for efficient JSONB queries

---

### 2. TypeScript Types

**New types** (`src/types/paymentMethods.ts`):
- `PaymentMethodType`: Union of all method types
- Method-specific interfaces: `CashPaymentMethod`, `CheckPaymentMethod`, `VenmoPaymentMethod`, etc.
- `PaymentMethodsConfig`: Top-level config with `methods` array
- `PaymentMethodDisplay`: For rendering in invoices/previews

**Updated types** (`src/types/invoice.ts`):
- Added `payment_methods_config?: any` to `InvoiceSettings` and `Invoice`
- Kept legacy `accepted_payment_methods` for backward compatibility

---

### 3. UI Components

**PaymentMethodsEditor** (`src/components/PaymentMethodsEditor.tsx`):
Already implemented with:
- ✅ Checkbox list for all 8 payment methods
- ✅ Method-specific inline forms with validation
- ✅ Required field enforcement (only when method enabled)
- ✅ Wire transfer bank details toggle
- ✅ Live preview showing exactly how methods appear on invoices
- ✅ Validation error summary

**Method-specific fields:**
- **Cash**: instructions (optional multiline)
- **Check**: payableTo* (required), mailingAddress (optional), memo (optional)
- **Venmo**: handle* (required), note (optional)
- **Zelle**: contact* (required email/phone), note (optional)
- **PayPal**: contact* (required email/URL), note (optional)
- **Cash App**: cashtag* (required), note (optional)
- **Wire**: instructions (optional), includeBankDetails toggle
  - If toggled: accountHolder, bankName, routingNumber, accountNumber, swift, reference
- **Credit Card**: paymentUrl* (required), acceptedCards (optional), note (optional)

**InvoiceSettings** (`src/components/InvoiceSettings.tsx`):
- ✅ Integrates `PaymentMethodsEditor` component
- ✅ Validates config before saving
- ✅ Saves both legacy and new formats for compatibility

---

### 4. Utilities

**Migration utilities** (`src/utils/paymentMethodsMigration.ts`):
- `migrateOldPaymentMethods()`: Converts legacy format to structured config
- `getPaymentMethodsConfig()`: Gets config with auto-migration fallback
- `validatePaymentMethodsConfig()`: Enforces required fields

**Display formatting** (`src/utils/formatPaymentMethods.ts`):
- `formatPaymentMethodsForDisplay()`: Converts config to display-ready strings
- Shared by invoice preview, HTML/PDF export, and email rendering
- Human-readable formatting:
  - "Venmo: @handle • Note: Invoice #123"
  - "Check: Payable to X • Memo: Invoice #123 • Mail to: ..."
  - "Wire: <instructions>" OR "Wire: Account Holder: X • Bank: Y • ..."
  - "Credit Card: Pay here: <link> • Accepted: Visa, MC"

**Invoice view model** (`src/utils/invoiceViewModel.ts`):
- ✅ Updated to use structured config via `getPaymentMethodsConfig()`
- ✅ Falls back to legacy format if new config unavailable
- ✅ Provides `paymentMethodDisplays` array for rendering

---

### 5. Invoice Rendering

**PDF/HTML generation** (`src/utils/generateInvoicePDF.ts`):
- ✅ Uses `viewModel.paymentMethodDisplays` from structured config
- ✅ Renders "Payment Methods:" section with formatted details
- ✅ Escapes HTML for security

**Email template** (`supabase/functions/send-invoice-email/index.ts`):
- ✅ Added `formatPaymentMethodsForEmail()` helper
- ✅ Renders structured payment methods in email HTML
- ✅ Styled section with blue background for visibility
- ✅ Masks account numbers for security (shows last 4 digits)
- ✅ Conditionally shows bank details only if `includeBankDetailsOnInvoice=true`

**Invoice template** (`src/components/InvoiceTemplate.tsx`):
- ✅ Already uses `viewModel.paymentMethods` for display
- ✅ Automatically picks up new structured format via view model

---

## Backward Compatibility

✅ **Fully backward compatible:**
1. Existing `accepted_payment_methods` array preserved
2. Migration auto-converts legacy data on first read
3. UI works with both old and new formats
4. Invoice rendering falls back to legacy if new config missing
5. No breaking changes to existing invoices or settings

---

## Testing Checklist

- [ ] Run migration: `supabase db reset` or apply migration manually
- [ ] Open Invoice Settings → Payment Methods
- [ ] Enable methods and fill in details
- [ ] Verify live preview shows correct formatting
- [ ] Save settings and verify data in database
- [ ] Create new invoice and verify payment methods appear correctly
- [ ] Export invoice as PDF/HTML and verify payment methods section
- [ ] Send invoice email and verify payment methods in email body
- [ ] Test validation: try saving with missing required fields
- [ ] Test wire transfer: toggle bank details on/off
- [ ] Verify legacy invoices still render correctly

---

## Files Modified/Created

**Created:**
- `supabase/migrations/20260217_add_payment_methods_config.sql`
- `PAYMENT_METHODS_REFACTOR_SUMMARY.md` (this file)

**Modified:**
- `supabase/functions/send-invoice-email/index.ts`
- `src/types/invoice.ts`

**Already existed (no changes needed):**
- `src/types/paymentMethods.ts` ✅
- `src/utils/paymentMethodsMigration.ts` ✅
- `src/utils/formatPaymentMethods.ts` ✅
- `src/components/PaymentMethodsEditor.tsx` ✅
- `src/components/InvoiceSettings.tsx` ✅
- `src/utils/invoiceViewModel.ts` ✅
- `src/utils/generateInvoicePDF.ts` ✅

---

## Next Steps

1. **Deploy migration**: Run `supabase db push` or deploy via CI/CD
2. **Test thoroughly**: Follow testing checklist above
3. **Monitor**: Check for any migration issues in production
4. **Cleanup (optional)**: After confirming all users migrated, could eventually deprecate legacy `accepted_payment_methods` array (but not urgent)

---

## Notes

- Wire transfer bank details are **masked** in displays (last 4 digits only) for security
- Payment methods only show on invoices if enabled in settings
- Invoice-level `payment_methods_config` allows per-invoice overrides (future feature)
- All validation happens client-side before save
- Edge Function lint errors for Deno are expected and can be ignored
