# Autocomplete Fix - Checkpoint

**Date:** November 21, 2025  
**Status:** Paused - flicker issue worse than before

## Problem Statement

The City and Venue autocomplete fields in "Add New Gig" modal are experiencing severe flicker and unreliable behavior:

- Dropdown flashes open/closed while typing
- Can't finish typing search terms smoothly
- Selection is unreliable
- Worse than the original state

## What We Tried

### Attempt 1: ignoreBlurRef Pattern
- Added `ignoreBlurRef` to prevent blur on dropdown clicks
- Added `e.preventDefault()` on `onMouseDown`
- **Result:** Still flickering

### Attempt 2: relatedTarget Checks
- Added `menuRef` to track dropdown container
- Checked `e.relatedTarget` in blur handler
- **Result:** Still flickering

### Attempt 3: Remove Blur Timeout
- Removed `setTimeout` in blur handler (was 150ms)
- Made blur close immediate
- **Result:** Still flickering

### Attempt 4: Increase Debounce
- Changed debounce from 250ms to 300ms
- **Result:** Still flickering

### Attempt 5: Remove Focus Reopening
- Made `handleFocus` empty (don't auto-reopen dropdown)
- **Result:** Still flickering

### Attempt 6: Pointer-Down Pattern
- Replaced `ignoreBlurRef` with `selectingRef`
- Used `onPointerDown` instead of `onMouseDown`
- Removed `preventDefault`
- **Result:** WORSE - flicker increased

## Current State

**Files Modified:**
- `src/components/PlaceAutocomplete.tsx`
- `src/components/AddressAutocomplete.tsx`
- `src/components/DropdownOverlay.tsx`
- `src/lib/keyboard.ts` (created)

**Last Commit:** `8c37b76` - "fix: implement pointer-down pattern for rock-solid autocomplete"

## Root Cause Hypothesis

The issue may be related to:

1. **React Native Web + Modal interaction**
   - Using RN `Modal` component for dropdown on web
   - Modal may be causing focus/blur events to fire unexpectedly
   - RN `Pressable` may not handle web events properly

2. **Multiple event handlers competing**
   - `onPointerDown`, `onMouseDown`, `onPress`, `onClick` all firing
   - Blur/focus events racing with selection
   - Modal backdrop interfering

3. **Platform-specific behavior**
   - Web-only handlers in RN components causing issues
   - `@ts-ignore` hiding type problems that indicate real issues

## What Needs to Happen (Fresh Approach)

### Option A: Pure Web Implementation
For web platform, render a **native HTML dropdown** instead of RN components:
- Use `createPortal` to `document.body`
- Use native `<div>` elements, not RN `View`/`Pressable`
- Use native DOM events, not RN synthetic events
- Only use RN components for native mobile

### Option B: Third-Party Library
Consider using a battle-tested autocomplete library:
- `react-select` (web-focused)
- `downshift` (headless, full control)
- `@reach/combobox` (accessible)

### Option C: Simplify Current Approach
Strip back to absolute basics:
- Remove ALL blur/focus handlers
- Use only `onChange` and `onClick`
- Let dropdown stay open until explicit close (click outside, Escape)
- Don't try to be smart about when to open/close

## Files to Review When Resuming

1. **PlaceAutocomplete.tsx** - Lines 171-192 (blur/focus handlers)
2. **PlaceAutocomplete.tsx** - Lines 303-327 (dropdown items)
3. **AddressAutocomplete.tsx** - Lines 154-162 (blur/focus handlers)
4. **AddressAutocomplete.tsx** - Lines 286-301 (dropdown items)
5. **DropdownOverlay.tsx** - Modal implementation

## Reference: Working Examples

Look at how these handle it:
- **Google Search** - dropdown never flickers, smooth typing
- **Sweetwater.com** - product search autocomplete
- **GitHub** - repository search
- **Vercel Dashboard** - project search

## Next Steps (When Ready)

1. **Test current state** - See exactly what's happening
2. **Consider Option A** - Pure web implementation with portal
3. **Simplify** - Remove complexity, start with basics
4. **Test incrementally** - Add one feature at a time

## Notes

- User is frustrated (understandably)
- Flicker is WORSE than before our changes
- Need a fresh perspective and approach
- Don't rush - take time to get it right

---

**To resume:** Read this document, test current behavior, decide on approach (A, B, or C), implement carefully with testing at each step.
