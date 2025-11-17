# ESLint Design System Enforcement

## Overview

ESLint has been configured to automatically enforce design system compliance across the codebase. This prevents developers from accidentally introducing hardcoded colors, spacing values, or bypassing the design system.

---

## 🎯 What's Enforced

### 1. **No Hardcoded Colors**
❌ **Blocked:**
```typescript
backgroundColor: '#3b82f6',  // Error!
color: '#111827',            // Error!
borderColor: 'rgb(59, 130, 246)',  // Error!
```

✅ **Required:**
```typescript
backgroundColor: colors.brand.DEFAULT,
color: colors.text.DEFAULT,
borderColor: colors.border.DEFAULT,
```

### 2. **No Color Literals in Styles**
The `react-native/no-color-literals` rule catches inline color usage:

❌ **Blocked:**
```typescript
<View style={{ backgroundColor: '#fff' }} />  // Error!
```

✅ **Required:**
```typescript
<View style={{ backgroundColor: colors.surface.DEFAULT }} />
```

### 3. **Warnings for Common Spacing Values**
⚠️ **Warned:**
```typescript
padding: 20,  // Warning - consider using spacing tokens
margin: 16,   // Warning - consider using spacing tokens
```

✅ **Recommended:**
```typescript
padding: parseInt(spacing[5]),
margin: parseInt(spacing[4]),
```

---

## 📜 Available Scripts

### Check for Design System Violations
```bash
npm run lint                    # Lint all src files
npm run lint:design-system      # Lint screens and components only
npm run lint:fix                # Auto-fix issues where possible
```

### Example Output
```
src/components/SomeComponent.tsx
  45:12  error  ❌ Hardcoded hex colors not allowed. 
                Use colors.* tokens (e.g., colors.brand.DEFAULT)
  67:8   warn   ⚠️  Consider using spacing tokens instead of 
                hardcoded values (e.g., parseInt(spacing[5]))
```

---

## 🛠️ Configuration

### Main Config File
**Location:** `eslint.config.js`

The configuration uses ESLint 9's flat config format with:
- TypeScript support
- React/React Native plugins
- Custom design system rules

### Key Rules

#### 1. No Hex Color Literals
```javascript
{
  selector: 'Literal[value=/#[0-9a-fA-F]{3,6}$/]',
  message: '❌ Hardcoded hex colors not allowed. Use colors.* tokens'
}
```

#### 2. No RGB/RGBA Literals
```javascript
{
  selector: 'Literal[value=/^rgba?\\(/]',
  message: '❌ Hardcoded RGB colors not allowed. Use colors.* tokens'
}
```

#### 3. React Native Color Literals
```javascript
'react-native/no-color-literals': 'error'
```

### Exempted Files
The following files are **exempt** from design system rules:
- `src/ui/**` - UI primitive components (need raw values)
- `src/styles/**` - Theme and token definitions
- `*.config.js` - Configuration files
- Test files

---

## 🚀 Usage Examples

### Running the Linter

#### Check All Files
```bash
npm run lint
```

#### Check Specific Directory
```bash
npx eslint src/screens --ext .ts,.tsx
```

#### Auto-Fix Issues
```bash
npm run lint:fix
```

#### Check Single File
```bash
npx eslint src/screens/DashboardScreen.tsx
```

### CI/CD Integration

Add to your CI pipeline (e.g., GitHub Actions):

```yaml
- name: Lint Code
  run: npm run lint

- name: Check Design System Compliance
  run: npm run lint:design-system
```

---

## 🔧 Fixing Violations

### Common Violations and Fixes

#### 1. Hardcoded Hex Color
**Before:**
```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9fafb',  // ❌ Error
  },
});
```

**After:**
```typescript
import { colors } from '../styles/theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.muted,  // ✅ Fixed
  },
});
```

#### 2. Inline Color Literal
**Before:**
```typescript
<View style={{ backgroundColor: '#3b82f6' }} />  // ❌ Error
```

**After:**
```typescript
import { colors } from '../styles/theme';

<View style={{ backgroundColor: colors.brand.DEFAULT }} />  // ✅ Fixed
```

#### 3. RGB Color
**Before:**
```typescript
const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',  // ❌ Error
  },
});
```

**After:**
```typescript
const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',  // Keep as-is for transparency
    // OR define in theme.ts if used frequently
  },
});
```

**Note:** For rgba with transparency, you may need to keep the literal or define it in the theme.

#### 4. Spacing Values
**Before:**
```typescript
const styles = StyleSheet.create({
  container: {
    padding: 20,  // ⚠️ Warning
    margin: 16,   // ⚠️ Warning
  },
});
```

**After:**
```typescript
import { spacing } from '../styles/theme';

const styles = StyleSheet.create({
  container: {
    padding: parseInt(spacing[5]),  // ✅ Fixed (20px)
    margin: parseInt(spacing[4]),   // ✅ Fixed (16px)
  },
});
```

---

## 📊 Design Token Reference

### Colors
```typescript
// Brand
colors.brand.DEFAULT      // #3b82f6
colors.brand.foreground   // #ffffff
colors.brand.hover        // #2563eb
colors.brand.muted        // #dbeafe

// Surface
colors.surface.DEFAULT    // #ffffff
colors.surface.muted      // #f9fafb

// Text
colors.text.DEFAULT       // #111827
colors.text.muted         // #6b7280
colors.text.subtle        // #9ca3af

// Semantic
colors.success.DEFAULT    // #10b981
colors.warning.DEFAULT    // #f59e0b
colors.danger.DEFAULT     // #ef4444

// Borders
colors.border.DEFAULT     // #e5e7eb
colors.border.muted       // #f3f4f6
```

### Spacing
```typescript
spacing[1]   // 4px
spacing[2]   // 8px
spacing[3]   // 12px
spacing[4]   // 16px
spacing[5]   // 20px
spacing[6]   // 24px
spacing[10]  // 40px
```

### Border Radius
```typescript
radius.sm    // 8px
radius.md    // 12px
radius.lg    // 16px
```

---

## 🎓 Best Practices

### 1. Always Import Tokens
```typescript
import { colors, spacing, radius, typography } from '../styles/theme';
```

### 2. Use parseInt() for Spacing
```typescript
padding: parseInt(spacing[5])  // ✅ Correct
padding: spacing[5]            // ❌ Type error
```

### 3. Prefer UI Components
Instead of styling raw components, use UI primitives:
```typescript
// ❌ Avoid
<Text style={{ fontSize: 24, fontWeight: '700' }}>Title</Text>

// ✅ Prefer
<H1>Title</H1>
```

### 4. Define Reusable Styles
For complex styles, define them in StyleSheet:
```typescript
const styles = StyleSheet.create({
  customButton: {
    backgroundColor: colors.brand.DEFAULT,
    padding: parseInt(spacing[3]),
    borderRadius: parseInt(radius.sm),
  },
});
```

---

## 🐛 Troubleshooting

### ESLint Not Running
```bash
# Reinstall dependencies
npm install

# Clear cache
rm -rf node_modules/.cache
```

### False Positives
If you have a legitimate use case for a hardcoded value:

```typescript
// eslint-disable-next-line react-native/no-color-literals
backgroundColor: 'transparent',  // Transparent is OK
```

### Updating Rules
Edit `eslint.config.js` to adjust rule severity:
```javascript
'react-native/no-color-literals': 'warn',  // Change to warning
```

---

## 📈 Impact

### Before ESLint Rules
- ❌ Developers could accidentally use hardcoded colors
- ❌ No automated enforcement
- ❌ Design system violations slip through code review
- ❌ Inconsistent styling over time

### After ESLint Rules
- ✅ Automatic detection of violations
- ✅ Enforced at development time
- ✅ Caught in CI/CD pipeline
- ✅ Guaranteed design system compliance
- ✅ Consistent codebase

---

## 🔗 Related Documentation

- **Design System**: `README-UI-UNIFICATION.md`
- **UI Components**: `src/ui/README.md`
- **Theme Tokens**: `src/styles/theme.ts`
- **Refactoring Guide**: `UI-REFACTORING-COMPLETE.md`

---

## ✅ Summary

ESLint is now configured to:
1. **Block** hardcoded hex colors
2. **Block** RGB/RGBA color literals  
3. **Warn** about common spacing values
4. **Enforce** design token usage
5. **Exempt** UI primitives and theme files

Run `npm run lint:design-system` to check compliance!

---

**Last Updated:** November 17, 2024  
**ESLint Version:** 9.39.1  
**Config Format:** Flat Config (ESLint 9+)
