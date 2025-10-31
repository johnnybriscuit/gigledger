# Automatic Mileage Calculation - Implementation Summary

## Overview
Enhanced the mileage tracking system to automatically calculate driving distance from home address to gig venue using Google Maps Distance Matrix API, eliminating manual mileage entry.

## ✅ Completed Changes

### 1. Database Migration
**File**: `/supabase/migrations/20251029_add_home_address_to_profiles.sql`

- Added `home_address` TEXT column to `profiles` table
- Used for storing user's home address for automatic mileage calculations

**Action Required**: Run this migration in Supabase SQL Editor

### 2. Account Settings Enhancement
**File**: `/src/screens/AccountScreen.tsx`

**Changes**:
- Added "Home Address" field in Profile section
- Multiline text input for full address entry
- Hint text: "Used for automatic mileage calculation"
- Saved with profile updates

**UI Location**: Account tab → Profile section → Home Address field

### 3. Mileage Service
**File**: `/src/services/mileageService.ts`

**Features**:
- `calculateDrivingDistance(origin, destination, roundTrip)` - Google Maps API integration (ready for API key)
- Returns: miles, duration, distance text
- Automatic round-trip doubling
- Error handling and fallback to manual entry

**API Integration** (commented out, ready to enable):
```typescript
// Requires: EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env
// Uses: Google Maps Distance Matrix API
// Endpoint: https://maps.googleapis.com/maps/api/distancematrix/json
```

### 4. Enhanced InlineMileageRow Component
**File**: `/src/components/gigs/InlineMileageRow.tsx`

**New Features**:
- **Auto-Calculate Button**: "📍 Auto-Calculate from Home" (blue button)
- **Round Trip Toggle**: Checkbox to enable/disable round trip calculation
- **Smart Hints**:
  - If no home address: "Add home address in Account settings to enable auto-calculate"
  - If no venue: "Add venue location to auto-calculate mileage"
- **Loading State**: Shows spinner while calculating
- **Auto-populated Note**: Includes distance, duration, and round trip status

**Props Updated**:
```typescript
interface InlineMileageRowProps {
  mileage: InlineMileage | null;
  onChange: (mileage: InlineMileage | null) => void;
  homeAddress?: string | null;      // NEW: From user profile
  venueAddress?: string;             // NEW: From gig location
}

interface InlineMileage {
  miles: string;
  note?: string;
  venueAddress?: string;             // NEW: Stores venue for recalculation
  roundTrip?: boolean;               // NEW: Round trip flag (default: true)
}
```

## 🔧 How It Works

### User Flow:

1. **Setup** (one-time):
   - Go to Account tab
   - Click "Edit" on Profile section
   - Enter home address (e.g., "123 Main St, Nashville, TN 37201")
   - Click "Save"

2. **Creating a Gig with Auto-Mileage**:
   - Click "+ Add Gig" from dashboard
   - Fill in basic info including **City** and **State** (or full Location)
   - Scroll to Mileage section
   - See blue "📍 Auto-Calculate from Home" button
   - Toggle "Round trip" checkbox if needed (default: ON)
   - Click "Auto-Calculate from Home"
   - Miles automatically populated with note showing distance and duration
   - Can still manually edit miles if needed

3. **Manual Entry** (fallback):
   - If no home address or API not configured
   - Enter miles manually as before
   - System shows helpful hints

### Calculation Logic:

```
IF home_address AND venue_address:
  → Show "Auto-Calculate" button
  → On click:
    1. Call Google Maps Distance Matrix API
    2. Get driving distance in meters
    3. Convert to miles (meters / 1609.34)
    4. If round_trip: miles × 2
    5. Round to 1 decimal place
    6. Auto-fill miles + note with details
ELSE:
  → Show manual entry with helpful hint
```

## 📋 Google Maps API Setup (Required for Auto-Calculate)

### Step 1: Get API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Distance Matrix API"
4. Go to Credentials → Create Credentials → API Key
5. Restrict the API key:
   - Application restrictions: None (or HTTP referrers for web)
   - API restrictions: Distance Matrix API only

### Step 2: Add to Environment

Create/update `.env` file:
```bash
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBNJRJ7kKDS1bGHaKmbpQf9D9nFc51wZqw
```

### Step 3: Enable in Code

Uncomment the API call in `/src/services/mileageService.ts`:

```typescript
export async function calculateDrivingDistance(
  origin: string,
  destination: string,
  roundTrip: boolean = true
): Promise<MileageCalculation | null> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      const distanceInMeters = element.distance.value;
      const miles = distanceInMeters / 1609.34;
      const finalMiles = roundTrip ? miles * 2 : miles;
      
      return {
        miles: Math.round(finalMiles * 10) / 10,
        duration: element.duration.text,
        distance: element.distance.text,
      };
    }
  } catch (error) {
    console.error('Error calculating distance:', error);
  }
  
  return null;
}
```

### Step 4: Pricing

- **Free Tier**: $200/month credit = ~40,000 requests
- **Cost**: $0.005 per request after free tier
- **Typical Usage**: 100-500 gigs/month = well within free tier

## 🎯 Benefits

1. **Accuracy**: Actual driving distance, not straight-line
2. **Time Savings**: No manual calculation or odometer checking
3. **Consistency**: Same calculation method for all gigs
4. **Audit Trail**: Note includes distance and duration for records
5. **Flexibility**: Can still manually override if needed
6. **IRS Compliant**: Accurate mileage logs with automatic deduction calculation

## 📝 Example Usage

### Before (Manual):
```
User drives to gig 15 miles away
→ Checks odometer or estimates
→ Enters "30" miles (round trip)
→ Manually types note
```

### After (Automatic):
```
User has home address saved
→ Enters gig location: "Blue Note, Nashville, TN"
→ Clicks "Auto-Calculate from Home"
→ System fills: "15.2 miles"
→ Note: "Auto: 15.2 mi (22 mins) round trip"
→ Deduction: $10.64 automatically calculated
```

## 🧪 Testing Checklist

### Setup Testing
- [ ] Run home_address migration
- [ ] Add home address in Account settings
- [ ] Verify address saves and displays correctly

### Auto-Calculate Testing (Without API Key)
- [ ] Create gig with location
- [ ] See "Auto-Calculate" button
- [ ] Click button → See "API not configured" message
- [ ] Manual entry still works

### Auto-Calculate Testing (With API Key)
- [ ] Add Google Maps API key to `.env`
- [ ] Uncomment API code in mileageService.ts
- [ ] Create gig with location
- [ ] Click "Auto-Calculate" → See spinner
- [ ] Verify miles populated correctly
- [ ] Check note includes distance and duration
- [ ] Toggle round trip → Recalculate → Verify miles doubled/halved

### Edge Cases
- [ ] No home address → See helpful hint
- [ ] No venue location → See helpful hint
- [ ] Invalid address → Graceful error, fallback to manual
- [ ] API error → Fallback to manual entry
- [ ] Manual override after auto-calculate → Works correctly

## 🚀 Future Enhancements

1. **Address Autocomplete**: Google Places API for venue address suggestions
2. **Route Visualization**: Show map with route
3. **Multiple Stops**: Calculate mileage for gigs with multiple venues
4. **Historical Data**: Recalculate mileage for past gigs if addresses change
5. **Offline Mode**: Cache common routes for offline use
6. **Alternative Routes**: Show fastest vs. shortest route options

## 📞 Troubleshooting

### "API not configured" message
- Check `.env` file has `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- Restart development server after adding env var
- Verify API code is uncommented in mileageService.ts

### "Failed to calculate mileage"
- Check Google Cloud Console → APIs enabled
- Verify API key restrictions allow Distance Matrix API
- Check browser console for detailed error
- Verify addresses are valid (try in Google Maps first)

### Incorrect mileage
- Verify round trip toggle is set correctly
- Check if Google Maps route matches your actual route
- Can manually override if needed

---

**Implementation Date**: October 29, 2025
**Status**: Core functionality complete, Google Maps API integration ready (requires API key)
**Next Steps**: 
1. Run database migration
2. Add home address in Account settings
3. (Optional) Add Google Maps API key for auto-calculate feature
