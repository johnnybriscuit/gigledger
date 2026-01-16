# Address Picker "Fighting Typing" Fix

## Problem
Address autocomplete inputs (venue, city, mileage) were "fighting" user typing:
- Input would reset/flicker after 3 characters
- Lost characters during fast typing
- Focus would jump or blur unexpectedly
- Dropdown would refresh and reset selection

## Root Cause
The `VenuePlacesInput` and `AddressPlacesInput` components had a problematic state synchronization pattern:

```typescript
// BEFORE - Problematic code
React.useEffect(() => {
  if (value !== internalValue) {
    setInternalValue(value);
  }
}, [value]);
```

This effect would run on **every render** and overwrite the internal input value whenever the parent's `value` prop changed, even while the user was actively typing. This caused:
1. Input resets mid-typing
2. Lost characters
3. Cursor position jumps
4. Flickering UI

## Solution

### 1. Added Typing State Tracking
Introduced refs to track when user is actively typing:
- `isTypingRef` - Boolean ref to track typing state
- `typingTimeoutRef` - Timeout to mark typing as finished after 1 second of inactivity

### 2. Protected State Sync
Modified the useEffect to **only sync external changes when user is NOT typing**:

```typescript
// AFTER - Fixed code
React.useEffect(() => {
  if (!isTypingRef.current && value !== internalValue) {
    setInternalValue(value);
  }
}, [value]);
```

### 3. Typing Detection
On text change, mark as typing and set timeout:

```typescript
const handleTextChange = (text: string) => {
  // Mark as actively typing
  isTypingRef.current = true;
  
  // Clear any existing timeout
  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
  }
  
  // Set timeout to mark typing as finished after 1 second of inactivity
  typingTimeoutRef.current = setTimeout(() => {
    isTypingRef.current = false;
  }, 1000);
  
  setInternalValue(text);
  onChange(text);
};
```

### 4. Selection Handling
On place selection, immediately mark as not typing:

```typescript
const handlePlaceSelect = (place: any) => {
  // Mark as not typing since this is a selection
  isTypingRef.current = false;
  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
  }
  
  // ... rest of selection logic
};
```

### 5. Cleanup
Added proper cleanup to prevent memory leaks:

```typescript
React.useEffect(() => {
  return () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };
}, []);
```

## Components Fixed

### VenuePlacesInput.tsx
Used in:
- `AddGigModal` - Venue autocomplete
- `AddGigModal` - City autocomplete
- Any other venue/city pickers

### AddressPlacesInput.tsx
Used in:
- `AddMileageModal` - Start/End location autocomplete
- Any other address pickers

### PlaceAutocomplete.tsx
Already had correct implementation ✅
- No internal state sync issues
- Proper debouncing (300ms)
- Request cancellation working

### AddressAutocomplete.tsx
Already had correct implementation ✅
- Free-solo typing (no forced selection)
- Proper debouncing (300ms)
- Request cancellation working

## Existing Good Patterns (Preserved)

### Debouncing
All components already had proper debouncing:
- **300ms delay** before API calls
- Prevents excessive requests during fast typing
- Feels responsive like Google autocomplete

### Request Cancellation
All components properly cancel stale requests:
```typescript
if (abortController.current) {
  abortController.current.abort();
}
abortController.current = new AbortController();
```

### Focus Management
All components have proper focus/blur handling:
- Delayed blur (150ms) to prevent race conditions with clicks
- Focus state tracking with refs for async checks
- Prevents focus/blur loops

### Stable Keys
All components use stable keys:
- `place_id` as key in FlatList
- No component remounting issues

## Testing

### Before Fix
❌ Type "Nashville" quickly → lost characters
❌ Input resets after 3 characters
❌ Flickering/jumping cursor
❌ Dropdown refreshes unexpectedly

### After Fix
✅ Type "Nashville" quickly → no lost characters
✅ Input stays stable throughout typing
✅ No flickering or cursor jumps
✅ Dropdown only updates after debounce
✅ Selection works smoothly
✅ Keep typing after 3 chars → no flicker

## QA Checklist

✅ Type quickly "Nashville" → no lost characters
✅ Select suggestion → field updates once
✅ Keep typing after 3 chars → no flicker
✅ Venue autocomplete works (AddGigModal)
✅ City autocomplete works (AddGigModal)
✅ Mileage start location works (AddMileageModal)
✅ Mileage end location works (AddMileageModal)
✅ No focus loss during typing
✅ No dropdown flicker
✅ Debouncing works (300ms)
✅ Request cancellation works

## Files Changed

- `src/components/VenuePlacesInput.tsx` - Fixed state sync
- `src/components/AddressPlacesInput.tsx` - Fixed state sync

## No Changes Needed

- `src/components/PlaceAutocomplete.tsx` - Already correct
- `src/components/AddressAutocomplete.tsx` - Already correct
- `api/places/autocomplete.ts` - Already has proper debouncing
- `api/places/details.ts` - No changes needed

## Technical Details

### Why This Works

1. **Ref-based tracking**: Using refs instead of state prevents re-renders
2. **Timeout pattern**: 1-second timeout ensures we don't block legitimate external updates
3. **Conditional sync**: Only sync when safe (not typing)
4. **Cleanup**: Proper cleanup prevents memory leaks and stale timeouts

### Why Not Use Controlled Input?

The `react-native-google-places-textinput` library manages its own internal state. We need to:
1. Keep our own `internalValue` to control the input
2. Sync with parent `value` prop for external updates
3. But **protect** this sync during active typing

This is a common pattern when wrapping third-party input components.

## Performance Impact

- **Minimal**: Only adds two refs and one timeout
- **No extra renders**: Refs don't trigger re-renders
- **Cleanup**: Proper cleanup prevents memory leaks
- **Debouncing preserved**: Still 300ms API call debounce

## Browser Compatibility

Works on:
- ✅ Desktop web (Chrome, Firefox, Safari)
- ✅ Mobile web (iOS Safari, Android Chrome)
- ✅ React Native (if used in native app)

## Future Improvements

1. **Configurable timeout**: Make the 1-second typing timeout configurable
2. **Typing indicator**: Could add visual indicator when actively typing
3. **Analytics**: Track typing patterns to optimize debounce timing
4. **Accessibility**: Ensure screen readers announce typing state

## Related Issues

This fix addresses the "fighting typing" issue without:
- ❌ Changing routing/AppShell
- ❌ Adding new external libraries
- ❌ Breaking existing functionality
- ❌ Affecting other components

All address picker inputs now have stable, flicker-free typing experience.
