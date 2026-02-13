# Google Tag Manager + GA4 Analytics Implementation

## Overview

This document describes the Google Tag Manager (GTM) and Google Analytics 4 (GA4) implementation for Bozzy (bozzygigs.com).

## Configuration

- **GTM Container ID**: `GTM-NGTVPGJH`
- **GA4 Measurement ID**: `G-CGH8GKENQL`
- **Domains**: bozzygigs.com, www.bozzygigs.com

## Installation

### 1. GTM Script Placement

GTM is installed in `web/index.html` with:
- GTM `<script>` tag in `<head>` (before other scripts)
- GTM `<noscript>` iframe immediately after `<body>` opening tag

This ensures GTM loads on every page of the Next.js/Expo web app.

### 2. Analytics Helper

Location: `src/lib/analytics.ts`

The `track()` function safely pushes events to GTM's dataLayer:
- SSR-safe (only runs in browser)
- No PII tracking (emails, names, addresses excluded)
- Type-safe event parameters

```typescript
import { track, trackGigCreated } from '../lib/analytics';

// Generic tracking
track('custom_event', { param1: 'value' });

// Typed helper functions
trackGigCreated({ entity_id: gigId, source: 'gig_modal' });
```

## Instrumented Events

### Auth Events

| Event | Method Values | Trigger Point |
|-------|--------------|---------------|
| `sign_up` | `google`, `magic_link`, `password` | After successful account creation |
| `login` | `google`, `magic_link`, `password` | After successful authentication |
| `logout` | - | When user signs out |

**Files**:
- `src/screens/AuthScreen.tsx` - password & magic link signup/login
- `src/screens/AuthCallbackScreen.tsx` - OAuth & magic link callback
- `src/screens/AccountScreen.tsx` - logout

### Core Usage Events

#### Gigs
| Event | Parameters | Trigger Point |
|-------|-----------|---------------|
| `gig_created` | `entity_id`, `source` | After gig successfully created |
| `gig_updated` | `entity_id`, `source` | After gig successfully updated |
| `gig_deleted` | `entity_id`, `source` | After gig successfully deleted |

**Files**:
- `src/services/gigService.ts` - create/update operations
- `src/hooks/useGigs.ts` - delete operation

#### Expenses
| Event | Parameters | Trigger Point |
|-------|-----------|---------------|
| `expense_created` | `entity_id`, `source` | After expense successfully created |
| `expense_deleted` | `entity_id`, `source` | After expense successfully deleted |

**Files**:
- `src/hooks/useExpenses.ts` - create/delete operations

#### Mileage
| Event | Parameters | Trigger Point |
|-------|-----------|---------------|
| `mileage_created` | `entity_id`, `source` | After mileage successfully created |
| `mileage_deleted` | `entity_id`, `source` | After mileage successfully deleted |

**Files**:
- `src/hooks/useMileage.ts` - create/delete operations

#### Invoices
| Event | Parameters | Trigger Point |
|-------|-----------|---------------|
| `invoice_created` | `entity_id`, `source` | After invoice successfully created |
| `invoice_sent` | `entity_id`, `source` | When invoice status changed to 'sent' |
| `invoice_marked_paid` | `entity_id`, `source` | When invoice status changed to 'paid' |

**Files**:
- `src/hooks/useInvoices.ts` - create/status update operations

#### Exports
| Event | Parameters | Trigger Point |
|-------|-----------|---------------|
| `export_created` | `export_type`, `source` | After export successfully downloaded |

Export types: `csv_bundle`, `json_backup`, `excel`, `pdf`, `txf`

**Files**:
- `src/screens/ExportsScreen.tsx` - export download handlers

#### Tours & Settlements
| Event | Parameters | Trigger Point |
|-------|-----------|---------------|
| `tour_created` | `entity_id`, `source` | After tour successfully created |
| `gigs_assigned_to_tour` | `count`, `source` | After gigs assigned to tour |
| `settlement_created` | `entity_id`, `source` | After settlement successfully created |

**Note**: Tour events are defined in analytics.ts but not yet instrumented (tour feature implementation in progress).

### Event Parameters

**Shared Parameters**:
- `entity_id` (string): Database ID of the created/updated/deleted entity
- `source` (string): UI component/screen where action occurred (e.g., `gig_modal`, `expenses_screen`)
- `count` (number): Count for bulk operations
- `method` (string): Auth method used
- `export_type` (string): Type of export generated

**PII Exclusions**:
- No emails, names, addresses, phone numbers
- No freeform user content (notes, descriptions)
- Only IDs, counts, types, and categorical data

## GTM Configuration

### Required Tags

1. **GA4 Configuration Tag**
   - Tag Type: Google Analytics: GA4 Configuration
   - Measurement ID: `G-CGH8GKENQL`
   - Trigger: Initialization - All Pages

2. **GA4 Event Tag (for SPA routing)**
   - Tag Type: Google Analytics: GA4 Event
   - Event Name: `page_view`
   - Trigger: History Change (for client-side routing)

### Triggers

1. **Initialization - All Pages**: Fires on page load
2. **History Change**: Fires on SPA route changes (for Next.js client-side navigation)

### Variables (Optional)

Create custom variables in GTM to capture dataLayer values:
- `dlv - event` (Data Layer Variable for event name)
- `dlv - entity_id` (Data Layer Variable for entity_id)
- `dlv - source` (Data Layer Variable for source)
- `dlv - method` (Data Layer Variable for auth method)
- `dlv - export_type` (Data Layer Variable for export type)

## Testing

### 1. GTM Preview Mode

1. Go to [Google Tag Manager](https://tagmanager.google.com/)
2. Select container `GTM-NGTVPGJH`
3. Click **Preview** button
4. Enter `https://bozzygigs.com` or `https://www.bozzygigs.com`
5. Perform actions in the app (create gig, login, etc.)
6. Verify events appear in GTM Preview panel

### 2. GA4 Realtime Reports

1. Go to [Google Analytics](https://analytics.google.com/)
2. Select property with ID `G-CGH8GKENQL`
3. Navigate to **Reports** → **Realtime**
4. Perform actions in the app
5. Verify events appear in Realtime report (may take 10-30 seconds)

### 3. Browser Console Testing

Open browser DevTools console and check for:
```javascript
// Check dataLayer exists
window.dataLayer

// View all events pushed
window.dataLayer.filter(item => item.event)

// In development, analytics logs to console
// Look for: [Analytics] event_name { params }
```

### 4. Test Checklist

- [ ] Page loads fire `page_view` event
- [ ] Client-side navigation fires `page_view` on History Change
- [ ] Sign up with each method (Google, magic link, password)
- [ ] Login with each method
- [ ] Logout
- [ ] Create/update/delete gig
- [ ] Create/delete expense
- [ ] Create/delete mileage
- [ ] Create invoice, mark as sent, mark as paid
- [ ] Download each export type (CSV, Excel, JSON, PDF, TXF)

## Deployment Notes

1. **Build Process**: The `web/index.html` file is used as the template for Expo web builds. After running `expo build:web`, the GTM scripts will be included in the output `dist/index.html`.

2. **Vercel Deployment**: The app is deployed to Vercel. The `dist` folder contains the built web app with GTM scripts included.

3. **Environment**: GTM container and GA4 property are configured for production use on bozzygigs.com and www.bozzygigs.com.

## Privacy & Compliance

- **No PII**: The implementation explicitly excludes personally identifiable information
- **User Consent**: Consider adding a cookie consent banner if required by your jurisdiction (GDPR, CCPA, etc.)
- **Data Retention**: Configure GA4 data retention settings in Google Analytics admin
- **IP Anonymization**: GA4 anonymizes IP addresses by default

## Maintenance

### Adding New Events

1. Add event function to `src/lib/analytics.ts`:
```typescript
export function trackNewEvent(params: {
  entity_id: string;
  source?: string;
}): void {
  track('new_event', params);
}
```

2. Import and call in the appropriate component:
```typescript
import { trackNewEvent } from '../lib/analytics';

// After successful operation
trackNewEvent({ entity_id: id, source: 'component_name' });
```

3. Update this documentation with the new event

### Debugging

If events aren't appearing:
1. Check browser console for `[Analytics]` logs (dev mode only)
2. Verify `window.dataLayer` exists and contains events
3. Use GTM Preview mode to see if tags are firing
4. Check GA4 DebugView (enable debug mode in GA4 admin)
5. Verify GTM container is published (not just in preview)

## Support

For issues or questions:
- GTM Documentation: https://support.google.com/tagmanager
- GA4 Documentation: https://support.google.com/analytics
- Implementation questions: Contact development team
