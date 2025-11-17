# GigLedger UI Foundations

## Design Philosophy

GigLedger's interface is designed to feel **calm, welcoming, and consistent**. We achieve this through:

- **Generous whitespace** - Let content breathe
- **Soft shadows over hard borders** - Create depth without harshness
- **Subtle interactions** - 120ms transitions feel responsive without being jarring
- **Clear hierarchy** - Typography and spacing guide the eye naturally
- **Musician-friendly language** - Plain, friendly copy over technical jargon

## Design Tokens

All design values are centralized in `src/styles/theme.ts`. **Never use raw values** - always reference tokens.

### Colors

```typescript
import { colors } from '@/styles/theme';

// Brand (warm amber/orange)
colors.brand.DEFAULT    // #f59e0b - Primary brand color
colors.brand.foreground // #ffffff - Text on brand background
colors.brand.hover      // #d97706 - Hover state
colors.brand.muted      // #fef3c7 - Subtle backgrounds

// Surface (clean, minimal)
colors.surface.DEFAULT  // #ffffff - Main background
colors.surface.muted    // #f9fafb - Subtle backgrounds
colors.surface.elevated // #ffffff - Elevated surfaces

// Text (clear hierarchy)
colors.text.DEFAULT     // #111827 - Primary text
colors.text.muted       // #6b7280 - Secondary text
colors.text.subtle      // #9ca3af - Tertiary text

// Semantic
colors.success.DEFAULT  // #10b981
colors.warning.DEFAULT  // #f59e0b
colors.danger.DEFAULT   // #ef4444

// Borders (subtle)
colors.border.DEFAULT   // #e5e7eb
colors.border.muted     // #f3f4f6
colors.border.focus     // #f59e0b
```

### Spacing

Use the spacing scale (4px increments):

```typescript
import { spacing } from '@/styles/theme';

spacing[1]  // 4px
spacing[2]  // 8px
spacing[3]  // 12px
spacing[4]  // 16px
spacing[5]  // 20px
spacing[6]  // 24px
spacing[8]  // 32px
spacing[12] // 48px
```

### Border Radius

```typescript
import { radius } from '@/styles/theme';

radius.sm   // 8px  - Badges, small buttons
radius.md   // 12px - Cards, buttons
radius.lg   // 16px - Modals, large cards
radius.xl   // 24px - Hero elements
```

### Typography

```typescript
import { typography } from '@/styles/theme';

// Display (hero numbers, page titles)
typography.fontSize.display.sm  // 32px / 1.2
typography.fontSize.display.md  // 36px / 1.2
typography.fontSize.display.lg  // 48px / 1.2

// Headings
typography.fontSize.h1          // 28px / 1.35
typography.fontSize.h2          // 22px / 1.35
typography.fontSize.h3          // 18px / 1.35

// Body
typography.fontSize.body        // 16px / 1.55
typography.fontSize.subtle      // 14px / 1.55
typography.fontSize.caption     // 12px / 1.5
```

## UI Primitives

All primitives are in `src/ui/` and exported from `src/ui/index.ts`.

### Button

```tsx
import { Button } from '@/ui';

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="success">Confirm</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading</Button>

// Full width
<Button fullWidth>Full Width</Button>

// With icons
<Button leftIcon={<Icon />}>With Icon</Button>
```

### Card

```tsx
import { Card, CardHeader, CardContent, CardFooter } from '@/ui';

<Card variant="elevated">
  <CardHeader>
    <H3>Card Title</H3>
  </CardHeader>
  <CardContent>
    <Text>Card content goes here</Text>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Typography

```tsx
import { Display, H1, H2, H3, Text, Caption } from '@/ui';

<Display>$12,345</Display>
<H1>Page Title</H1>
<H2>Section Title</H2>
<H3>Subsection Title</H3>
<Text>Body text</Text>
<Text muted>Muted text</Text>
<Text semibold>Semibold text</Text>
<Caption>Small label text</Caption>
```

### Badge

```tsx
import { Badge } from '@/ui';

<Badge variant="neutral">Pending</Badge>
<Badge variant="success">Paid</Badge>
<Badge variant="warning">Due Soon</Badge>
<Badge variant="danger">Overdue</Badge>
```

### Stat

```tsx
import { Stat } from '@/ui';

<Stat
  label="Net Profit YTD"
  value="$12,345"
  delta={{ value: '+12.5%', variant: 'success' }}
/>
```

### Other Components

- **SectionHeader** - Page/section titles with optional actions
- **Field** - Form field wrapper with label, help, error
- **EmptyState** - Friendly empty states with CTA
- **Modal** - Full-screen modal with title, description, actions
- **Container** - Page container with max-width and padding

## Formatting Utilities

Use consistent formatting for numbers:

```typescript
import { formatCurrency, formatPercentage, formatDate } from '@/utils/format';

formatCurrency(12345)           // "$12,345"
formatCurrency(12345.67, true)  // "$12,345.67"
formatPercentage(0.141)         // "14.1%"
formatDate(new Date())          // "Nov 17, 2025"
```

## Layout Patterns

### Page Structure

```tsx
<Container maxWidth="max" padding>
  <SectionHeader
    title="Page Title"
    actions={<Button>Action</Button>}
  />
  
  <View style={{ gap: spacing[6] }}>
    <Card>
      <CardContent>
        {/* Content */}
      </CardContent>
    </Card>
  </View>
</Container>
```

### Form Layout

```tsx
<View style={{ gap: spacing[4] }}>
  <Field label="Field Label" required>
    <TextInput />
  </Field>
  
  <Field
    label="Another Field"
    help="Helpful information"
  >
    <TextInput />
  </Field>
</View>
```

### Card Grid

```tsx
<View style={{
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: spacing[4],
}}>
  <Card style={{ flex: 1, minWidth: 300 }}>
    {/* Card content */}
  </Card>
  <Card style={{ flex: 1, minWidth: 300 }}>
    {/* Card content */}
  </Card>
</View>
```

## Do's and Don'ts

### ✅ Do

- Use design tokens for all colors, spacing, and typography
- Use UI primitives instead of custom components
- Keep button placement consistent (primary action bottom-right in forms, top-right in listings)
- Use generous whitespace (gap-4 or gap-6 between sections)
- Write friendly, plain language in UI copy
- Test with real data, not Lorem Ipsum

### ❌ Don't

- Use raw hex colors or arbitrary values
- Create one-off styled components
- Mix different button styles on the same page
- Cram content together without spacing
- Use technical jargon or abbreviations
- Assume users understand tax terminology

## Accessibility

- All interactive elements have visible focus states
- Color contrast meets WCAA AA standards (4.5:1 for body, 3:1 for large text)
- Modals and menus are keyboard-navigable
- Icon-only buttons have aria-labels
- Form fields have proper labels and error messages

## Motion

- **Fast (120ms)** - Button hover, badge transitions
- **Base (180ms)** - Modal open/close, card hover
- **Slow (300ms)** - Page transitions, complex animations

All transitions use `ease-out` timing for natural feel.

## Testing

View all components in action at `/style-guide` route.

## Questions?

If you're unsure about a pattern or need a new component, check:
1. The style guide page (`/style-guide`)
2. Existing screens for similar patterns
3. This documentation
4. Ask the team!
