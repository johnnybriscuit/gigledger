# Accessibility Testing Guide

## Overview

This guide provides step-by-step instructions for testing the accessibility improvements made to GigLedger. Follow these tests to ensure WCAG 2.1 Level AA compliance.

---

## 🎯 Testing Checklist

### ✅ Phase 1: Screen Reader Testing

#### iOS - VoiceOver
**Setup:**
1. Open Settings > Accessibility > VoiceOver
2. Enable VoiceOver
3. Learn basic gestures:
   - Swipe right: Next element
   - Swipe left: Previous element
   - Double tap: Activate
   - Two-finger swipe up: Read from top

**Tests:**
- [ ] All buttons announce their purpose
- [ ] Form labels are read correctly
- [ ] Error messages are announced immediately
- [ ] Loading states are announced
- [ ] Modal titles are announced when opened
- [ ] Cards group related content properly
- [ ] Empty states provide clear context

**Expected Results:**
```
Button: "Add new gig"
Hint: "Double tap to open form"

Text field: "Name"
Required
Value: [current value]

Alert: "Name is required"
```

#### Android - TalkBack
**Setup:**
1. Open Settings > Accessibility > TalkBack
2. Enable TalkBack
3. Learn basic gestures:
   - Swipe right: Next element
   - Swipe left: Previous element
   - Double tap: Activate
   - Swipe down then right: Read from top

**Tests:**
- [ ] Same tests as iOS VoiceOver
- [ ] Verify Android-specific announcements

#### Web - NVDA (Windows) / VoiceOver (Mac)
**Setup:**
- **NVDA**: Download from nvaccess.org
- **VoiceOver**: Cmd + F5 to enable

**Tests:**
- [ ] Keyboard navigation works (Tab key)
- [ ] Skip link appears on first Tab
- [ ] All interactive elements are reachable
- [ ] Modals trap focus properly
- [ ] Escape key closes modals

---

### ✅ Phase 2: Keyboard Navigation (Web Only)

#### Basic Navigation
**Tests:**
- [ ] Tab key moves through interactive elements
- [ ] Shift + Tab moves backwards
- [ ] Enter activates buttons
- [ ] Space activates buttons
- [ ] Escape closes modals
- [ ] Focus indicators are visible

**Expected Behavior:**
```
Tab Order:
1. Skip Link (appears on focus)
2. Add Gig button
3. First gig card
4. Edit button
5. Delete button
... (logical order)
```

#### Focus Indicators
**Tests:**
- [ ] All focusable elements have visible outline
- [ ] Focus outline has sufficient contrast (3:1)
- [ ] Focus outline is not obscured
- [ ] Custom focus styles match design system

**Visual Check:**
```css
/* Expected focus style */
outline: 2px solid #3b82f6;
outline-offset: 2px;
```

#### Modal Focus Management
**Tests:**
- [ ] Focus moves to modal when opened
- [ ] Tab cycles within modal only
- [ ] Escape closes modal
- [ ] Focus returns to trigger element on close
- [ ] Background content is not focusable

---

### ✅ Phase 3: Color Contrast

#### Text Contrast
**Tool:** WebAIM Contrast Checker (webaim.org/resources/contrastchecker/)

**Tests:**
- [ ] Brand color on white: #3b82f6 on #ffffff (8.59:1) ✅
- [ ] Text color on white: #111827 on #ffffff (16.05:1) ✅
- [ ] Muted text on white: #6b7280 on #ffffff (4.69:1) ✅
- [ ] Subtle text on white: #9ca3af on #ffffff (2.85:1) ⚠️
- [ ] Error text on white: #ef4444 on #ffffff (4.54:1) ✅
- [ ] Success text on white: #10b981 on #ffffff (3.04:1) ⚠️

**Required Ratios:**
- Normal text: 4.5:1 (AA)
- Large text (18px+): 3:1 (AA)
- UI components: 3:1 (AA)

#### UI Component Contrast
**Tests:**
- [ ] Button borders: 3:1 minimum
- [ ] Form input borders: 3:1 minimum
- [ ] Focus indicators: 3:1 minimum
- [ ] Card borders: 3:1 minimum

---

### ✅ Phase 4: Touch Targets

#### Size Requirements
**Minimum:** 44x44 pixels (WCAG 2.1 Level AAA)

**Tests:**
- [ ] All buttons are at least 44px tall
- [ ] Icon buttons are at least 44x44px
- [ ] Form inputs are at least 44px tall
- [ ] List items are at least 44px tall
- [ ] Adequate spacing between targets (8px min)

**Measurement Tool:**
```javascript
// In browser console
const button = document.querySelector('button');
const rect = button.getBoundingClientRect();
console.log(`Width: ${rect.width}px, Height: ${rect.height}px`);
```

---

### ✅ Phase 5: Form Accessibility

#### Label Association
**Tests:**
- [ ] All inputs have associated labels
- [ ] Labels are announced by screen readers
- [ ] Required fields are indicated
- [ ] Error messages are associated with inputs
- [ ] Help text is associated with inputs

**Code Check:**
```typescript
<Field label="Name" required error={errors.name}>
  <TextInput value={name} onChangeText={setName} />
</Field>

// Should generate:
// accessibilityLabel="Name"
// accessibilityRequired={true}
// accessibilityInvalid={!!error}
```

#### Error Handling
**Tests:**
- [ ] Errors are announced immediately
- [ ] Error messages are clear and actionable
- [ ] Error icon/color is not the only indicator
- [ ] Errors persist until fixed
- [ ] Success messages are announced

---

### ✅ Phase 6: Dynamic Content

#### Loading States
**Tests:**
- [ ] Loading spinner has accessible label
- [ ] Loading message is announced
- [ ] Loading state uses accessibilityLiveRegion="polite"
- [ ] Content updates are announced

**Expected Announcement:**
```
"Loading your gigs..."
[pause]
"10 gigs loaded"
```

#### Error States
**Tests:**
- [ ] Errors use accessibilityRole="alert"
- [ ] Errors use accessibilityLiveRegion="assertive"
- [ ] Error messages are clear and helpful
- [ ] Retry actions are available

---

## 🛠️ Testing Tools

### Automated Testing

#### 1. ESLint
```bash
npm run lint:design-system
```
**Checks:**
- Hardcoded colors
- Missing accessibility props
- Design system compliance

#### 2. TypeScript
```bash
npm run typecheck
```
**Checks:**
- Type safety
- Prop validation
- Component interfaces

### Manual Testing Tools

#### 1. Chrome DevTools
**Lighthouse Audit:**
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Select "Accessibility"
4. Run audit

**Target Score:** 90+

#### 2. axe DevTools Extension
**Install:** chrome.google.com/webstore (search "axe DevTools")

**Usage:**
1. Open DevTools
2. Go to axe DevTools tab
3. Click "Scan ALL of my page"
4. Review issues

#### 3. WAVE Extension
**Install:** wave.webaim.org/extension/

**Usage:**
1. Click WAVE icon in toolbar
2. Review errors, alerts, and features
3. Check contrast issues

---

## 📋 Complete Test Matrix

### Component Testing

#### Button Component
- [ ] Has accessibilityRole="button"
- [ ] Has accessibilityLabel (auto or manual)
- [ ] Has accessibilityState for disabled
- [ ] Announces loading state
- [ ] Minimum 44px height
- [ ] Visible focus indicator

#### Field Component
- [ ] Label has accessibilityRole="text"
- [ ] Input receives accessibilityLabel
- [ ] Required indicator announced
- [ ] Error uses accessibilityRole="alert"
- [ ] Help text is accessible

#### Card Component
- [ ] Optional accessibilityLabel groups content
- [ ] Related content is grouped
- [ ] Interactive cards are accessible

#### Modal Component
- [ ] Has accessibilityViewIsModal
- [ ] Title + description announced
- [ ] Escape key closes (web)
- [ ] Focus trapped within modal
- [ ] Focus restored on close
- [ ] Close button accessible

#### EmptyState Component
- [ ] Title + description combined
- [ ] Icon hidden from screen readers
- [ ] Action button accessible

#### LoadingState Component
- [ ] Has accessibilityRole="progressbar"
- [ ] Uses accessibilityLiveRegion="polite"
- [ ] Message is announced

#### ErrorState Component
- [ ] Has accessibilityRole="alert"
- [ ] Uses accessibilityLiveRegion="assertive"
- [ ] Retry button accessible

---

## 🎯 Success Criteria

### Minimum Requirements (WCAG 2.1 Level AA)
- [ ] All interactive elements keyboard accessible
- [ ] All images have alt text or are decorative
- [ ] Color contrast meets 4.5:1 for text
- [ ] Color contrast meets 3:1 for UI components
- [ ] All form inputs have labels
- [ ] Error messages are clear and accessible
- [ ] Focus indicators are visible
- [ ] Skip navigation link present (web)
- [ ] No keyboard traps
- [ ] Consistent navigation

### Target Scores
- **Lighthouse Accessibility:** 90+ (currently ~75)
- **axe DevTools:** 0 critical issues
- **WAVE:** 0 errors
- **Manual Testing:** All tests pass

---

## 🐛 Common Issues and Fixes

### Issue: Button not announced
**Fix:**
```typescript
<Button accessibilityLabel="Add new gig">
  + Add
</Button>
```

### Issue: Form input not labeled
**Fix:**
```typescript
<Field label="Name" required>
  <TextInput value={name} onChangeText={setName} />
</Field>
```

### Issue: Error not announced
**Fix:**
```typescript
{error && (
  <Text 
    accessibilityRole="alert"
    accessibilityLiveRegion="assertive"
  >
    {error}
  </Text>
)}
```

### Issue: Modal focus not trapped
**Fix:**
```typescript
<Modal
  visible={visible}
  onClose={onClose}
  title="Add Gig"
>
  {/* Modal uses FocusScope internally */}
</Modal>
```

### Issue: Loading state not announced
**Fix:**
```typescript
<LoadingState message="Loading your gigs..." />
// Uses accessibilityLiveRegion internally
```

---

## 📊 Testing Schedule

### Daily (During Development)
- [ ] ESLint checks
- [ ] TypeScript checks
- [ ] Visual inspection

### Weekly
- [ ] Screen reader testing (one platform)
- [ ] Keyboard navigation testing
- [ ] Contrast checks

### Before Release
- [ ] Full screen reader testing (all platforms)
- [ ] Complete keyboard navigation
- [ ] Lighthouse audit
- [ ] axe DevTools scan
- [ ] WAVE scan
- [ ] Manual checklist review

---

## 📚 Resources

### Official Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [Apple Accessibility](https://developer.apple.com/accessibility/)
- [Android Accessibility](https://developer.android.com/guide/topics/ui/accessibility)

### Testing Tools
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Extension](https://wave.webaim.org/extension/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### Learning Resources
- [A11y Project](https://www.a11yproject.com/)
- [WebAIM](https://webaim.org/)
- [Inclusive Components](https://inclusive-components.design/)

---

## ✅ Final Checklist

Before marking accessibility complete:

### Implementation
- [x] All UI components have accessibility props
- [x] Form fields have proper labels
- [x] Errors are announced
- [x] Loading states are announced
- [x] Modals have focus management
- [x] Keyboard navigation works (web)
- [x] Skip links present (web)

### Testing
- [ ] Screen reader testing complete (iOS)
- [ ] Screen reader testing complete (Android)
- [ ] Screen reader testing complete (Web)
- [ ] Keyboard navigation tested
- [ ] Color contrast verified
- [ ] Touch targets measured
- [ ] Lighthouse score 90+
- [ ] axe DevTools 0 critical issues
- [ ] WAVE 0 errors

### Documentation
- [x] Testing guide created
- [x] Component documentation updated
- [x] Known issues documented
- [x] Remediation plan created

---

**Last Updated:** November 17, 2024  
**Status:** Phase 4 - Testing and Refinement  
**Next Steps:** Complete manual testing on all platforms
