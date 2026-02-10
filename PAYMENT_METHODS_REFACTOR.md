# Payment Methods Refactor - Implementation Summary

## Overview
Refactored the invoice payment methods system from a generic text field approach to structured, method-specific configurations with proper validation and enhanced invoice rendering.

## What Changed

### 1. Data Model (Supabase)
- **New Column**: `payment_methods_config` (JSONB) added to `invoice_settings` table
- **Migration**: `supabase/migrations/20260210_add_payment_methods_config.sql`
- **Backward Compatible**: Old `accepted_payment_methods` column retained for migration

### 2. TypeScript Types
- **New File**: `src/types/paymentMethods.ts`
  - `PaymentMethodType` enum (cash, check, venmo, zelle, paypal, cashapp, wire, card)
  - Method-specific interfaces with required/optional fields
  - `PaymentMethodsConfig` top-level structure
  - `PaymentMethodDisplay` for rendering

### 3. Utilities

#### Migration & Compatibility
- **File**: `src/utils/paymentMethodsMigration.ts`
- `migrateOldPaymentMethods()` - Converts old format to new structure
- `getPaymentMethodsConfig()` - Smart getter with auto-migration
- `validatePaymentMethodsConfig()` - Validates required fields

#### Display Formatting
- **File**: `src/utils/formatPaymentMethods.ts`
- `formatPaymentMethodsForDisplay()` - Shared formatter for UI and invoices
- Handles all method-specific formatting rules
- Safe handling of bank details (masks account numbers)
- Consistent output for preview and PDF

### 4. UI Components

#### PaymentMethodsEditor
- **File**: `src/components/PaymentMethodsEditor.tsx`
- Method-specific forms with proper placeholders
- Real-time validation with inline errors
- Live preview showing how methods appear on invoices
- Expandable/collapsible sections

#### Updated InvoiceSettings
- **File**: `src/components/InvoiceSettings.tsx`
- Integrated `PaymentMethodsEditor` component
- Validates payment methods before save
- Saves both old and new formats for backward compatibility

### 5. Invoice Rendering

#### Updated View Model
- **File**: `src/utils/invoiceViewModel.ts`
- Added `paymentMethodDisplays` field
- Accepts `settings` parameter for new config
- Falls back to legacy format if needed

#### Updated HTML Generator
- **File**: `src/utils/generateInvoicePDF.ts`
- Uses `paymentMethodDisplays` from view model
- Renders structured payment methods with labels
- Added `page-break-inside: avoid` for print CSS

## Method-Specific Fields

### Cash
- `instructions` (optional) - Custom instructions

### Check
- `payableTo` (required) - Who to make check out to
- `mailingAddress` (optional) - Where to mail check
- `memo` (optional) - Memo line (defaults to invoice #)

### Venmo
- `handle` (required) - @username
- `note` (optional) - Note to include

### Zelle
- `contact` (required) - Email or phone
- `note` (optional) - Note to include

### PayPal
- `contact` (required) - Email or paypal.me URL
- `note` (optional) - Note to include

### Cash App
- `cashtag` (required) - $username
- `note` (optional) - Note to include

### Wire Transfer
- `instructions` (optional) - General instructions
- `includeBankDetailsOnInvoice` (boolean) - Toggle for showing bank details
- When enabled:
  - `accountHolder` - Account holder name
  - `bankName` - Bank name
  - `routingNumber` - Routing number
  - `accountNumber` - Account number (masked in display)
  - `swift` (optional) - SWIFT code
  - `reference` (optional) - Reference (defaults to invoice #)

### Credit/Debit Card
- `paymentUrl` (required) - Payment link (Stripe, etc.)
- `acceptedCards` (optional) - Accepted card types
- `note` (optional) - Additional note

## Migration Strategy

### Automatic Migration
1. UI loads old `accepted_payment_methods` if `payment_methods_config` is null
2. `getPaymentMethodsConfig()` auto-migrates to new format
3. User sees new UI with migrated data
4. On save, both formats are written (backward compatible)

### Migration Logic
- Venmo: Detects `@handle` format
- Zelle/PayPal: Detects email/phone/URL patterns
- Cash App: Detects `$cashtag` format
- Wire: Maps to instructions
- Others: Best-effort mapping

### Rollout
1. Deploy migration (adds column)
2. Deploy code (reads new format, falls back to old)
3. Users organically migrate on first save
4. After full migration, can deprecate old column

## Invoice Display Examples

### Before (Generic)
```
Payment Methods Accepted:
• Venmo: @johndoe
• Check
```

### After (Structured)
```
Payment Methods:
Venmo: @johndoe • Note: Invoice #INV-001
Check: Check payable to: John Burkhardt • Memo: Invoice #INV-001
```

## Testing Checklist

- [ ] New user creates payment methods from scratch
- [ ] Existing user's old payment methods auto-migrate
- [ ] Validation prevents saving with missing required fields
- [ ] Preview matches invoice rendering
- [ ] Invoice PDF shows formatted payment methods
- [ ] Wire transfer bank details only show when enabled
- [ ] Account numbers are masked in display
- [ ] All 8 payment method types work correctly

## Files Changed

### New Files
- `supabase/migrations/20260210_add_payment_methods_config.sql`
- `src/types/paymentMethods.ts`
- `src/utils/paymentMethodsMigration.ts`
- `src/utils/formatPaymentMethods.ts`
- `src/components/PaymentMethodsEditor.tsx`

### Modified Files
- `src/types/invoice.ts` - Added `payment_methods_config` field
- `src/components/InvoiceSettings.tsx` - Integrated new editor
- `src/utils/invoiceViewModel.ts` - Added new payment method displays
- `src/utils/generateInvoicePDF.ts` - Updated rendering

## Support Contact
For wire transfer fallback: support@bozzygigs.com

## Notes
- No external PDF libraries added (kept HTML + browser print approach)
- All user input is sanitized with `escapeHtml()`
- TypeScript types ensure type safety across the system
- Validation happens both client-side and before save
