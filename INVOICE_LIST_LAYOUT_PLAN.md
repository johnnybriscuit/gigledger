# Invoice List Layout Improvements

## Problem
- Invoice list getting cut off at bottom (insufficient scroll area)
- Too much vertical space consumed by header elements
- List doesn't properly scroll on typical laptop/mobile heights

## Root Cause
- Missing `flex: 1` and `minHeight: 0` in parent flex containers
- Too many large UI elements stacked vertically before list
- No proper flex wrapper around scrollable list

## Solution Strategy

### 1. Fix Flex Layout (Critical)
```typescript
// Container must have flex: 1
container: {
  flex: 1,
  backgroundColor: '#f9fafb',
}

// Add wrapper around list with proper flex
listWrapper: {
  flex: 1,
  minHeight: 0,  // Critical for nested flex scrolling
}

// List container gets flex: 1
listContainer: {
  flex: 1,
  paddingHorizontal: 16,
}

// Add padding to content
listContentContainer: {
  paddingBottom: 24,
}
```

### 2. Compact Metrics (Reduce ~60px height)
Convert 3 large cards to single horizontal strip:
```typescript
compactMetricsStrip: {
  flexDirection: 'row',
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#e5e7eb',
  borderRadius: 8,
  marginHorizontal: 16,
  marginTop: 12,
  marginBottom: 12,
  padding: 12,
}

compactMetric: {
  flex: 1,
  alignItems: 'center',
}

compactMetricLabel: {
  fontSize: 11,
  color: '#6b7280',
  marginBottom: 4,
}

compactMetricValue: {
  fontSize: 16,
  fontWeight: '700',
  color: '#111827',
}
```

### 3. Dismissible Tip Banner (Save ~40px when dismissed)
```typescript
const [tipDismissed, setTipDismissed] = useState(false);

compactTipBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#eff6ff',
  padding: 10,
  marginHorizontal: 16,
  marginTop: 12,
  marginBottom: 8,
  borderRadius: 6,
}

compactTipText: {
  flex: 1,
  fontSize: 12,
  color: '#1e40af',
}

dismissButton: {
  padding: 4,
  marginLeft: 8,
}
```

### 4. Combined Search + Sort Row (Save ~40px)
```typescript
searchSortRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  marginBottom: 12,
  gap: 8,
}

compactSearchInput: {
  flex: 1,
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#d1d5db',
  borderRadius: 8,
  padding: 10,
  fontSize: 14,
}

sortDropdown: {
  flexDirection: 'row',
  gap: 4,
}

sortOptionButton: {
  paddingHorizontal: 10,
  paddingVertical: 8,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: '#d1d5db',
  backgroundColor: '#fff',
}
```

### 5. Compact Status Pills (Reduce height ~10px)
```typescript
compactFilterContainer: {
  paddingHorizontal: 16,
  marginBottom: 12,
  maxHeight: 40,
}

compactPill: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#d1d5db',
  backgroundColor: '#fff',
  marginRight: 6,
}

compactPillText: {
  fontSize: 13,
  color: '#374151',
}
```

## Total Space Saved
- Metrics: ~60px
- Tip banner (when dismissed): ~40px  
- Search + Sort combined: ~40px
- Compact pills: ~10px
**Total: ~150px more for invoice list**

## Implementation Order
1. Add tipDismissed state
2. Replace tip banner with compact dismissible version
3. Replace metrics cards with compact strip
4. Combine search and sort into one row
5. Make filter pills more compact
6. Add listWrapper with flex: 1 and minHeight: 0
7. Update ScrollView with contentContainerStyle
8. Test on desktop (1440x900, 1280x720) and mobile (390-430px width)

## Files to Modify
- `src/components/InvoiceList.tsx` (main changes)

## Testing Checklist
- [ ] Desktop 1440x900: List scrolls, no cutoff
- [ ] Desktop 1280x720: List scrolls, no cutoff
- [ ] Mobile 390px: List scrolls, no cutoff
- [ ] Tip banner dismisses and stays dismissed
- [ ] All filters/search/sort still work
- [ ] Invoice cards render correctly
- [ ] No layout shift when switching tabs
