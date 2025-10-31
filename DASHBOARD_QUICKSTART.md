# Premium Dashboard - Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

Already installed:
- ✅ `recharts` - Web charts
- ✅ `victory-native` - Mobile charts (ready for use)

### 2. Start Development Server
```bash
npm start
```

### 3. View the Dashboard
- **Web**: Press `w` or open `http://localhost:8081`
- **iOS**: Press `i` (requires Xcode)
- **Android**: Press `a` (requires Android Studio)

## 🎨 What You'll See

### Dashboard Tab (Default)
1. **Hero Card** - Net profit with sparkline and tax breakdown
2. **Quick Actions** - Add Gig, Expense, Export buttons
3. **Monthly Overview** - Grouped bar chart (click bars!)
4. **Cumulative Net** - Line chart showing running total
5. **Expense Breakdown** - Top 5 categories
6. **Top Payers** - Donut chart (click slices!)

### Try These Interactions:
- Click date range buttons (YTD, Last 30, Last 90, Last Year)
- Click "+ Add Gig" to open the gig form
- Click a bar in Monthly Overview → Drill-through drawer opens
- Click a slice in Top Payers → Filters gigs by that payer
- Click "View all expenses" → Navigates to Expenses tab

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Dashboard loads without errors
- [ ] All charts render with data
- [ ] Date range buttons work
- [ ] Quick actions open modals
- [ ] Tab navigation works

### Chart Interactions
- [ ] Monthly Overview: Click bar → Drawer opens
- [ ] Top Payers: Click slice → Navigates to gigs
- [ ] Expense Breakdown: "View all" works
- [ ] Tooltips show on hover (web)

### Drill-Through
- [ ] Drawer slides in from right (web)
- [ ] Shows correct month data
- [ ] Lists gigs, expenses, mileage
- [ ] Summary totals are accurate
- [ ] Close button works

### Theme (Ready for Toggle)
- [ ] Light mode looks good
- [ ] Dark mode ready (add toggle to test)
- [ ] Colors are consistent
- [ ] Text is readable

### Responsive
- [ ] Desktop: Two-column layout
- [ ] Tablet: Wraps appropriately
- [ ] Mobile: Single column
- [ ] Charts adapt to screen size

## 🐛 Known Issues / TODOs

### Immediate
- [ ] Custom date range picker not implemented
- [ ] Theme toggle UI not added (context ready)
- [ ] CSV export in drill-through (placeholder)
- [ ] Loading skeletons not added
- [ ] Empty states need improvement

### Nice to Have
- [ ] Victory Native charts for mobile (using lists now)
- [ ] Chart download as PNG
- [ ] Goal setting in Account page
- [ ] Receipt scanning

## 📝 Quick Fixes

### If Charts Don't Show
```bash
# Clear cache and restart
rm -rf node_modules/.cache
npm start -- --clear
```

### If Theme Doesn't Work
Check that App.tsx has:
```typescript
<ThemeProvider>
  <AppContent />
</ThemeProvider>
```

### If Drill-Through is Empty
1. Check console for errors
2. Verify data exists for selected month
3. Check date filtering in `MonthDrillThrough.tsx`

## 🎯 Next Steps

### 1. Add Theme Toggle (5 min)
In `AccountScreen.tsx`, add:
```typescript
import { useTheme } from '../contexts/ThemeContext';

const { theme, toggleTheme } = useTheme();

// In render:
<TouchableOpacity onPress={toggleTheme}>
  <Text>{theme === 'light' ? '🌙 Dark' : '☀️ Light'}</Text>
</TouchableOpacity>
```

### 2. Add Loading Skeletons (15 min)
Create `/src/components/charts/ChartSkeleton.tsx`:
```typescript
export function ChartSkeleton() {
  return (
    <View style={styles.skeleton}>
      <View style={styles.bar} />
      <View style={styles.bar} />
      <View style={styles.bar} />
    </View>
  );
}
```

### 3. Add Empty State (10 min)
In `EnhancedDashboard.tsx`:
```typescript
if (data.monthly.length === 0) {
  return <EmptyDashboard onAddGig={onAddGig} />;
}
```

### 4. Custom Date Range (30 min)
- Add date picker library
- Create DateRangePicker component
- Wire to `setCustomRange` in useDateRange

## 📊 Data Flow Diagram

```
User Action
    ↓
DashboardScreen (manages tabs)
    ↓
EnhancedDashboard (orchestrates)
    ↓
useDateRange() ← URL params + localStorage
    ↓
useDashboardData(range) ← Fetches from Supabase
    ↓
[Charts] ← Render with data
    ↓
User clicks chart
    ↓
SidePanel opens
    ↓
MonthDrillThrough ← Filters data by month
    ↓
Shows detailed records
```

## 🎨 Customization Examples

### Change Primary Color
```typescript
// src/lib/charts/colors.ts
export const chartColors = {
  blue: '#YOUR_BLUE',  // Change this
  // ...
};
```

### Add New Quick Action
```typescript
// src/components/dashboard/QuickActions.tsx
const actions = [
  // ... existing actions
  {
    icon: '📸',
    label: 'Scan',
    color: chartColors.amber,
    onPress: onScanReceipt,
  },
];
```

### Modify Chart Layout
```typescript
// src/components/dashboard/EnhancedDashboard.tsx
<View style={styles.twoColumn}>
  <View style={styles.column}>
    {/* Your chart here */}
  </View>
</View>
```

## 💡 Pro Tips

1. **Use React Query DevTools** (web):
   ```bash
   npm install @tanstack/react-query-devtools
   ```

2. **Check Network Tab** for API calls

3. **Use Console** for debugging:
   ```typescript
   console.log('Dashboard data:', data);
   ```

4. **Test with Different Data**:
   - Add gigs with various dates
   - Add expenses in different categories
   - Test with no data (empty state)

## 📞 Need Help?

### Common Questions

**Q: Charts are blank**  
A: Check if you have data in the selected date range

**Q: Drill-through shows wrong data**  
A: Verify month string format matches "Jan 2025"

**Q: Theme doesn't persist**  
A: Check localStorage in browser DevTools

**Q: Mobile charts look different**  
A: That's expected! We use simplified views on mobile

### Debug Mode
Add to any component:
```typescript
console.log('Theme:', theme);
console.log('Date range:', range);
console.log('Dashboard data:', data);
```

---

**Ready to test!** 🎉  
Open the app and explore the new premium dashboard!

