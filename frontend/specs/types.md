# Type Definitions — Influencer Analytics Dashboard

> **Stage 2** · Documents every internal JavaScript type, function signature, and shape used throughout the frontend. These correspond to the JSDoc-annotated (or implicit) data flows in `dashboard.js`, `chart-renderer.mjs`, and `shared-utils.js`.

---

## Primitive Utilities

### `escapeHtml(value: string): string`

Escapes `&`, `<`, `>`, `"`, `'` for safe HTML interpolation.  
*Source:* `shared-utils.js` and inlined in `dashboard.js`.

### `formatCurrency(amount: number, currency?: string): string`

Formats `amount` as locale-aware currency using `Intl.NumberFormat`.  
Defaults to `"USD"`. Rounds to zero fraction digits.  
*Source:* `dashboard.js`

---

## Data Shapes

### `DataPayload`

The top-level JSON object fetched from `data/dashboard.json`.

```typescript
interface DataPayload {
  period:        string;            // Human-readable label, e.g. "Last 60 days"
  asOf:          string;            // ISO 8601 date, e.g. "2026-11-17"
  currency:      string;            // ISO 4217 currency code
  commissionRate: number;           // 0–1 decimal fraction
  products:      ProductSummary[];  // Lifetime aggregates
  platforms:     PlatformSummary[]; // Lifetime aggregates
  dailyRecords:  DailyRecord[];     // Daily per-product/platform tuples
  alerts:        Alert[];           // Contextual notifications
}
```

### `ProductSummary`

Lifetime-aggregated product row.

```typescript
interface ProductSummary {
  name:     string;   // Display name
  platform: string;   // Matches a PlatformSummary.name
  price:    number;   // Unit price (>= 0)
  units:    number;   // Total units sold (>= 0)
  revenue:  number;   // Total revenue (>= 0)
}
```

### `PlatformSummary`

Lifetime-aggregated platform row.

```typescript
interface PlatformSummary {
  name:           string;   // Canonical platform name
  reach:          number;   // Unique audience reached (>= 0)
  engagementRate: number;   // Percentage points, e.g. 198.0
  clicks:         number;   // Total link clicks (>= 0)
  conversions:    number;   // Completed conversions (>= 0)
  revenue:        number;   // Attributed revenue (>= 0)
  roasSum:        number;   // Sum of daily ROAS values (>= 0)
  count:          number;   // Number of aggregation days (>= 1)
  roas:           number;   // Average ROAS (roasSum / count) (>= 0)
}
```

### `DailyRecord`

A single day's data for one product on one platform.

```typescript
interface DailyRecord {
  date:     string;   // ISO 8601, e.g. "2026-09-19"
  product:  string;   // Product name
  platform: string;   // Platform name
  price:    number;   // Unit price for that day (>= 0)
  units:    number;   // Units sold (>= 0)
  revenue:  number;   // Revenue for that day (>= 0)
}
```

### `Alert`

A contextual notification message.

```typescript
interface Alert {
  tone:    "warning" | "success" | "info";
  message: string;   // Human-readable, safe-HTML after escaping
}
```

---

## Derived (Computed) Shapes

### `Summary`

Returned by `summarize()`. Aggregates KPIs from filtered product and platform lists.

```typescript
interface Summary {
  revenue:         number;   // Sum of product revenue
  sales:           number;   // Sum of product units
  commission:      number;   // revenue * commissionRate
  engagementRate:  number;   // Reach-weighted average engagement rate
  reach:           number;   // Sum of platform reach
  clicks:          number;   // Sum of platform clicks
  conversions:     number;   // Sum of platform conversions
}
```

### `ChartRow`

Each bar in the accessible bar-chart renderer.

```typescript
interface ChartRow {
  label: string;   // Bar label (already escaped)
  value: string;   // Formatted value string, e.g. "$4,000"
  amount: number;  // Numeric value for bar-width calculation
}
```

Returned by `parseChartTable(table)` and consumed by `renderChart(data, scale)`.

---

## Function Signatures

### Module: `dashboard.js`

```typescript
function summarize(
  data: DataPayload,
  products?: ProductSummary[],
  platforms?: PlatformSummary[]
): Summary;

function filterAndSortProducts(
  products: ProductSummary[],
  query: string,
  sortKey: string
): ProductSummary[];

function parseChartTable(table: HTMLTableElement): ChartRow[];

function initializeCharts(
  documentObject: Document,
  Observer: typeof IntersectionObserver | null,
  loadChartJs?: () => Promise<{ default: ChartConstructor }>
): Map<Element, ChartInstance>;

function getAsOf(): Date;

function filterRecords(
  records: DailyRecord[],
  daysBack: number
): DailyRecord[];

function aggregateProducts(records: DailyRecord[]): ProductSummary[];

function aggregatePlatforms(records: DailyRecord[]): PlatformSummary[];

function init(
  documentObject: Document,
  fetchFunction?: typeof fetch,
  storage?: Storage | null
): Promise<DataPayload>;
```

### Module: `chart-renderer.mjs`

```typescript
function renderChart(
  data: ChartRow[],
  scale: "total" | "maximum"
): string;
// Returns an HTML string of bar rows, or an empty-state paragraph.
```

### Module: `shared-utils.js`

```typescript
function escapeHtml(value: string): string;
```

---

## CSS Custom Properties (Design Tokens)

Defined in `dashboard.css` for theming:

```css
:root {
  --page-bg: #f1f5f9;
  --panel-bg: #ffffff;
  --panel-muted: #f8fafc;
  --text-main: #1e293b;
  --text-muted: #64748b;
  --border-color: #e2e8f0;
}

:root[data-theme="dark"] {
  --page-bg: #0b1120;
  --panel-bg: #111c2e;
  --panel-muted: #18263b;
  --text-main: #e2e8f0;
  --text-muted: #9aaac0;
  --border-color: #2b3b52;
}
```

## Event Payloads

| Event | Source Element | Payload / Behaviour |
|---|---|---|
| `input` | `#product-search` | Re-renders product table with filtered/sorted results |
| `change` | `#product-sort` | Re-sorts product table rows |
| `change` | `#platform-filter` | Sets `chosenPlatform`, re-renders all sections |
| `change` | `#period-filter` | Re-filters `dailyRecords`, re-aggregates, re-renders |
| `click` | `#theme-toggle` | Toggles `data-theme` on `<html>`, persists to `localStorage` |