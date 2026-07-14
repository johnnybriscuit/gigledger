# Add Expense / Add Mileage UX Walkthrough

**Scope:** Observation only — no code changes were made as part of this task.
**Device:** iOS Simulator, iPhone (440×956pt / 1320×2868px @3x)
**Baseline before/after:** 24 gigs / $4,145 take-home / $635 saved for taxes; 9 expenses / $1,050 total & deductible; 9 mileage trips / 397.6 miles / $288.26 deduction. All confirmed restored after cleanup.

All screenshots referenced below are in this folder (downscaled copies alongside this report; originals remain in `qa-screens/add-expense/` in the repo).

---

## Is AddExpenseModal a separate implementation from AddGigModal?

**Yes — fully separate. Nothing is shared.** Confirmed at the code level (`src/components/AddExpenseModal.tsx` vs `src/components/AddGigModal.tsx`):

- **`scrollFieldIntoView`** (the keyboard-avoidance fix built for Add Gig) is a **private function defined inline inside `AddGigModal.tsx`** (line ~168). It was never extracted into a shared hook or util, so there was nothing for `AddExpenseModal.tsx` to inherit even if someone had tried. Grep confirms it exists nowhere outside `AddGigModal.tsx`.
- **`useSafeAreaInsets`** (react-native-safe-area-context) is imported in `AddGigModal.tsx` but **not** in `AddExpenseModal.tsx`. Only three files in the whole `components/` tree import it: `AddGigModal.tsx`, `ui/FilterBottomSheet.tsx`, and `layout/AppShell.tsx` — `AddExpenseModal.tsx` isn't one of them.
- The two modals also don't share a common `Modal`/header/`ScrollView` wrapper component — each defines its own `<Modal animationType="slide" transparent>` tree from scratch, with independent styles.

**Bottom line:** both fixes from the Add Gig round were one-off, in-file changes rather than reusable components, so "inherited" was never on the table — they'd have had to be manually ported, and they weren't.

---

## Works well

1. **Entry point (c)** — "+ Add Expense" from the Expenses list screen (`01c-entry-fromexpenseslist.png`) opens the modal directly with a clean, consistent form state.
2. **Category taxonomy** (`01-entry-dashboard-chip.png`, `01c-entry-fromexpenseslist.png`) — all 11 categories fit on one screen, no scrolling needed: Meals & Entertainment, Travel, Lodging, Equipment/Gear, Supplies, Software/Subscriptions, Marketing/Promotion, Professional Fees, Education/Training, Rent/Studio, Other.
3. **Dynamic deductibility hints** (`10-business-use-slider.png`, `11b-meals-toggle.png`) — the blue info banner changes per category ("Usually 50% deductible for business meals," "Large purchases may need to be depreciated," "Deductible if space is used for business," etc.) and updates accurately as category changes.
4. **Business Use % slider** (`10-business-use-slider.png`) and **Meals Deductible 50/100% toggle** (`11b-meals-toggle.png`) both compute correctly in real time ("You can deduct $X of this $Y expense").
5. **Date picker** (`12-date-picker.png`, `21-datepicker2.png`) opens/closes cleanly and defaults sensibly to today.
6. **Amount keyboard** is correctly decimal-pad (`06-amount-focused.png`).
7. **Save flow works and totals update accurately** — expense save went 9→10 / $1,050→$1,075 correctly (`32-save-result.png`); mileage save went 9→10 trips, 397.6→401.1 miles, $288.26→$290.80 correctly (`44-mileage-save-result.png`).
8. **Native Places autocomplete works in Mileage's Start/End Location fields** (`37-start-location-autocomplete.png`, `39-end-location.png`, `40-end-selected.png`) — confirms the native-URL proxy fix from the earlier Places-proxy task carries through to this modal too.
9. Manual miles entry with **live tax-deduction recalculation** works correctly (`42-miles-manual.png`).
10. "Save this route for quick access later" checkbox and the Quick-Add recurring-expense suggestion ("100 Oaks Storage Unit $191") are nice, easy-to-miss touches worth calling out.

Bonus: Gig and Mileage deletes both show an "Are you sure? / cannot be undone" confirmation dialog (`46-mileage-delete2.png`, `52-delete-gig-confirm.png`).

---

## Bugs & concerns

1. **No keyboard-avoidance on Add Expense** (`kb-check.png`, `06-amount-focused.png`) — `AddExpenseModal.tsx` never got the `scrollFieldIntoView`/`onFocus` fix built for Add Gig (see the shared-components note above — there was nothing to inherit). With the keyboard up, the focused Description field and the Amount field (with its decimal keypad) are completely hidden below the keyboard. Confirmed live via screenshot, not just by code inspection.
2. **Amount field leading-zero bug** (`30-amount-typed.png`, compare to the clean `06b-amount-typed.png` case) — the field starts with a literal `"0.00"` string value (not just a placeholder). If you tap in and type without clearing it first, you get malformed on-screen values like `"042.50"`. The underlying number still parses correctly for calculations (confirmed the Business Use $ deduction computed correctly off the malformed string), but it's a real display/data-entry rough edge.
3. **Raw validation error shown to users** (`17-validation-error.png`) — submitting with required fields empty shows a developer-facing toast: `"Expense submission error: ZodError: ["` (confirmed truncated JSON via dev server logs: `too_small` errors for `date` and `description`), instead of a friendly message like Add Gig's "Missing Required Fields" dialog. Also notable: an empty/zero Amount did **not** trigger its own validation error — only Date and Description did.
4. **Receipt upload is a silent no-op on native** (`13-receipt-upload-tap.png`) — tapping "Upload Receipt" (both the top auto-fill button and the bottom Receipt field button) does nothing at all on iOS — no picker, no error, no explanation. `handleFileSelect` in the source is entirely wrapped in `if (Platform.OS === 'web')` using `document.createElement('input')`, with no `expo-image-picker`/`expo-document-picker` fallback for native.
5. **Post-gig prompt buttons don't open the modals directly** (`01b-entry-postgig-prompt.png`) — "Add Expense" from the post-save gig prompt navigates to the Expenses *list* screen, not the Add Expense modal. By the same code pattern (`onNavigateToExpenses`/`onNavigateToMileage` are plain screen navigations, not modal triggers), "Add Mileage" from that same prompt would navigate to the Mileage *list* screen too, not open Add Mileage directly. Users get an extra tap they may not expect.
6. **Mileage "Calculate" (auto-distance) fails** (`41-calculate-result.png`) — errors with `NO_DRIVING_ROUTE`, shown as a semi-raw toast (`"Distance calculation error: Error: NO_DRIVING_R..."`) alongside a friendlier inline fallback message ("Couldn't calculate a driving route right now..."). Likely a separate, not-yet-configured Google Directions API call (distinct from the Places Autocomplete proxy that was fixed and verified working in this same session — see item 8 in "Works well").
7. **Inconsistent delete confirmation** (`49-expense-delete-confirm.png` vs. `46-mileage-delete2.png` / `52-delete-gig-confirm.png`) — deleting an Expense has **no confirmation dialog at all**; it's an instant, permanent delete on a single tap of "Delete." Deleting a Mileage trip or a Gig both show a confirmation dialog with explicit "cannot be undone" language. This is a real risk for accidental, unrecoverable data loss on the Expenses screen specifically.
8. **Inconsistent Date pre-fill** — Add Mileage pre-fills Date with today (`35-mileage-modal.png`); Add Expense leaves Date empty (`YYYY-MM-DD` placeholder, `15-fresh-modal.png`) even though it's a required field.
9. **Minor/dev-only** — a `VirtualizedLists should never be nested inside pla...` React Native warning surfaced as a toast (`37-start-location-autocomplete.png`) when the location-suggestion dropdown rendered inside the Mileage form's `ScrollView`. Likely dev-build-only noise (not user-facing in production), but worth a look since it can affect scroll behavior of the suggestion list.
10. **Safe-area insets** — like Add Gig before its fix, `AddExpenseModal.tsx` has no `useSafeAreaInsets`, just hardcoded `paddingTop: 20` / `paddingBottom: Platform.OS === 'ios' ? 40 : 20`. Unlike Add Gig's pre-fix state, I did **not** observe actual visual clipping in this simulator/device — the header and Save button both had adequate clearance in every screenshot taken. But it's not using the shared safe-area-aware pattern, so it's one device/notch change away from a real problem. Worth porting for consistency even without an active visible bug today.

---

## Screenshot index (selected)

| # | File | What it shows |
|---|------|----------------|
| 1 | `01-entry-dashboard-chip.png` | Entry point (a): Add Expense modal from dashboard chip |
| 1b | `01b-entry-postgig-prompt.png` | Entry point (b): post-gig prompt navigates to Expenses list, not modal |
| 1c | `01c-entry-fromexpenseslist.png` | Entry point (c): "+ Add Expense" from list screen |
| 6 | `06-amount-focused.png` | Amount focused — keyboard covers field, decimal-pad confirmed |
| 10 | `10-business-use-slider.png` | Business Use % slider, live deduction calc |
| 11b | `11b-meals-toggle.png` | Meals Deductible 50/100% toggle |
| 12 | `12-date-picker.png` | Date picker calendar |
| 13 | `13-receipt-upload-tap.png` | Receipt upload — silent no-op on native |
| 17 | `17-validation-error.png` | Raw ZodError toast on empty-field submit |
| 30 | `30-amount-typed.png` | Leading-zero bug: "042.50" |
| 32 | `32-save-result.png` | Successful expense save, totals updated |
| 37 | `37-start-location-autocomplete.png` | Native Places autocomplete working in Mileage |
| 41 | `41-calculate-result.png` | Mileage auto-distance calculation failure |
| 44 | `44-mileage-save-result.png` | Successful mileage save, totals updated |
| 46 | `46-mileage-delete2.png` | Mileage delete confirmation dialog |
| 49 | `49-expense-delete-confirm.png` | Expense delete — no confirmation, already gone |
| 52 | `52-delete-gig-confirm.png` | Gig delete confirmation dialog |
| 53 | `53-gigs-baseline-restored.png` | Final cleanup confirmation, baseline restored |

Full set of ~60 screenshots (including intermediate/failed-tap frames kept for audit trail) accompanies this report.
