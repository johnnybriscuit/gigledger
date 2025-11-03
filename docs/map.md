# Interactive Map Feature

## Overview

The dashboard includes an interactive choropleth map showing where gigs have been performed. Users can toggle between US states and world countries view, with hover tooltips and click-through drill-down to see detailed gig lists.

## Dependencies

### Required npm packages:
```bash
npm install react-simple-maps topojson-client d3-scale
npm install --save-dev @types/topojson-client @types/d3-scale
```

### TopoJSON Assets

Download and place in `assets/maps/`:

1. **US States** (10m resolution):
   - URL: https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json
   - Save as: `assets/maps/us-states-10m.json`

2. **World Countries** (110m resolution):
   - URL: https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json
   - Save as: `assets/maps/world-110m.json`

## Database Schema

### New Columns

Added to `gigs` table:
- `country_code` (text): ISO 3166-1 alpha-2 country code (e.g., 'US', 'CA', 'GB')
- `state_code` (text): US 2-letter state code (e.g., 'TN', 'CA'), nullable for non-US

### Views

**`v_map_us_states`**: Aggregates gigs by US state
- `state_code`: 2-letter state code
- `gigs_count`: Total gigs in state
- `total_income`: Sum of all gig income
- `top_payers`: Array of up to 3 payer names
- `last_gig_date`: Most recent gig date

**`v_map_world`**: Aggregates gigs by country
- Same fields as above, but grouped by `country_code`

### Indexes

- `idx_gigs_country`: On `country_code`
- `idx_gigs_state`: On `state_code`
- `idx_gigs_country_state`: Composite index

## Components

### MapCard
Main wrapper component with:
- Title and scope toggle (USA / World)
- Legend showing color scale
- Map component (USMap or WorldMap)
- Loading and empty states

### USMap / WorldMap
Platform-specific implementations:
- **Web**: Uses `react-simple-maps` with TopoJSON
- **Mobile**: Uses `react-native-svg` with pre-parsed paths

### RegionTooltip
Shows on hover/press:
- Region name
- Gig count and total income
- Top 3 payers
- Last gig date

### RegionDrawer
Side panel (web) or modal (mobile) showing:
- **Gigs tab**: List of all gigs in region
- **Payers tab**: Payer breakdown for region
- Export CSV button (scoped to region + date range)

## Color Scale

Choropleth uses quantized scale based on gig count:
- **0 gigs**: Light gray
- **1-5 gigs**: Light blue
- **6-15 gigs**: Medium blue
- **16-50 gigs**: Blue
- **51+ gigs**: Dark blue
- **Hover**: Amber highlight

Dark mode uses adjusted colors for better contrast.

## Data Flow

1. **Date range filter** from dashboard controls map data
2. **useMapStats** hook fetches and aggregates gig data
3. **Map component** renders regions with color scale
4. **Hover** shows tooltip with stats
5. **Click** opens drawer with detailed gig list

## Adding New Regions

### US States
Already complete - all 50 states + DC included in `regionNames.ts`.

### Countries
To add a new country:

1. Add to `COUNTRY_NAMES` in `src/lib/maps/regionNames.ts`:
```typescript
export const COUNTRY_NAMES: Record<string, string> = {
  // ... existing
  XX: 'Country Name',  // Use ISO 3166-1 alpha-2 code
};
```

2. Ensure country exists in world TopoJSON (most do)

3. Update gigs with country code:
```sql
update gigs set country_code = 'XX' where ...;
```

## Aggregation Queries

### Manual aggregation (if views don't work)

```typescript
// Client-side aggregation example
const statsMap: RegionStatsMap = {};

gigs.forEach(gig => {
  const code = gig.state_code; // or country_code
  if (!statsMap[code]) {
    statsMap[code] = {
      code,
      label: getStateName(code),
      gigsCount: 0,
      totalIncome: 0,
      topPayers: [],
      lastGigDate: null,
    };
  }
  
  statsMap[code].gigsCount++;
  statsMap[code].totalIncome += calculateIncome(gig);
  // ... etc
});
```

### View queries

```sql
-- US states for current user
select * from v_map_us_states 
where user_id = auth.uid();

-- World countries for current user
select * from v_map_world 
where user_id = auth.uid();
```

## Performance Considerations

1. **Memoization**: Map features and scales are memoized to avoid re-parsing
2. **Indexes**: Database indexes on location columns for fast filtering
3. **Views**: Pre-aggregated data reduces client-side computation
4. **Lazy loading**: TopoJSON loaded once and cached
5. **Skeleton states**: Show loading skeleton while data fetches

## Mobile Optimizations

1. **Simplified geometry**: Use lower-resolution TopoJSON (110m for world, 10m for US)
2. **Touch targets**: Inflate hit areas for small regions
3. **Pan/zoom**: Basic gesture support with clamped zoom levels
4. **Performance**: Keep render under 16ms on mid-range devices

## Accessibility

- **Keyboard navigation**: Regions are focusable with tab
- **ARIA labels**: Each region has descriptive label with stats
- **High contrast**: Color scale works in high contrast mode
- **Screen readers**: Legend and tooltips are screen-reader friendly

## Future Enhancements (Stretch Goals)

1. **Visited counter**: Show "X states visited" or "X countries played"
2. **Shareable image**: Export map as PNG for social media
3. **Heat map mode**: Toggle between choropleth and heat map
4. **Time animation**: Animate gig history over time
5. **Venue markers**: Show individual venue locations (requires lat/long)

## Troubleshooting

### Map not showing
- Check TopoJSON files are in `assets/maps/`
- Verify gigs have `country_code` and/or `state_code` populated
- Check browser console for errors

### Colors not updating
- Ensure date range filter is connected to `useMapStats`
- Check that gigs are within the selected date range
- Verify color scale logic in `colorScale.ts`

### Performance issues
- Reduce TopoJSON resolution (use 50m instead of 10m)
- Add pagination to region drawer gig list
- Memoize expensive calculations

### Mobile gestures not working
- Ensure `react-native-gesture-handler` is installed
- Check that gesture handler is wrapped around map component
- Verify touch targets are large enough (min 44x44 points)

## Testing

```bash
# Run map-specific tests
npm test -- map

# Test with different date ranges
# Test with 0 gigs, 1 gig, many gigs
# Test US and World toggle
# Test hover and click interactions
# Test export functionality
```

## Migration Notes

Run migration to add location columns:
```bash
supabase migration up
```

Backfill existing gigs with location data (manual or via script):
```sql
-- Example: Set all existing gigs to US/TN (update as needed)
update gigs 
set country_code = 'US', state_code = 'TN'
where country_code is null;
```
