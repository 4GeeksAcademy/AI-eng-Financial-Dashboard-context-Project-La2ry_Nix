# Data Contract — Influencer Analytics Dashboard

> **Stage 2** · Defines the shape and semantics of every JSON payload the dashboard fetches at runtime.

## Endpoint

| Property | Value |
|---|---|
| **Path** | `data/dashboard.json` (static file) |
| **Method** | `GET` |
| **Content-Type** | `application/json` |
| **Cache** | No caching; fetched fresh on every `init()` call |

---

## Top‑Level Shape

```jsonc
{
  // Required
  "period":        "string",
  "asOf":          "string (ISO 8601 date)",
  "currency":      "string (ISO 4217)",
  "commissionRate": "number (0–1)",
  "products":      "Product[]",
  "platforms":     "Platform[]",
  "dailyRecords":  "DailyRecord[]",
  "alerts":        "Alert[]"
}
```

---

## `Product`

```jsonc
{
  "name":     "string",          // Display name — may appear in HTML, must be escaped
  "platform": "string",          // Platform identifier; must match Platform.name
  "price":    "number (>= 0)",   // Unit price in currency units
  "units":    "number (>= 0)",   // Total units sold
  "revenue":  "number (>= 0)"    // price * units
}
```

**Aggregation note:** `Product` objects in the top-level `products` array represent **lifetime aggregates**. The frontend also derives per‑period product summaries via `aggregateProducts(dailyRecords)`.

---

## `Platform`

```jsonc
{
  "name":           "string",             // Canonical platform name (e.g. "Instagram")
  "reach":          "number (>= 0)",      // Unique audience reached
  "engagementRate": "number (>= 0)",      // Percentage points (e.g. 198.0 = 198%)
  "clicks":         "number (>= 0)",      // Total link clicks
  "conversions":    "number (>= 0)",      // Completed conversion actions
  "revenue":        "number (>= 0)",      // Attributed revenue
  "roasSum":        "number (>= 0)",      // Sum of daily ROAS values
  "count":          "number (>= 1)",      // Number of days aggregated
  "roas":           "number (>= 0)"       // Computed: roasSum / count
}
```

---

## `DailyRecord`

```jsonc
{
  "date":     "string (ISO 8601 date)",   // e.g. "2026-09-19"
  "product":  "string",                   // Product name
  "platform": "string",                   // Platform name
  "price":    "number (>= 0)",            // Unit price
  "units":    "number (>= 0)",            // Units sold that day
  "revenue":  "number (>= 0)"             // revenue = price × units
}
```

**Cardinality:** One record per product–platform–date tuple.  
**Date range:** Covers the full reporting `period` ending on `asOf`.  
**Filtering:** `filterRecords(records, daysBack)` uses the `date` field with `<` comparison against `cutoff = asOf - daysBack`.

---

## `Alert`

```jsonc
{
  "tone":    "string",    // One of: "warning" | "success" | "info"
  "message": "string"     // Human-readable alert text — must be HTML-escaped
}
```

**Display:** Rendered as a list in the Quick alerts sidebar. The `tone` value maps to a colour accent (not relied upon as the sole differentiator — labels beyond colour are preserved).

---

## Example Payload

```json
{
  "period": "Last 60 days",
  "asOf": "2026-11-17",
  "currency": "USD",
  "commissionRate": 0.15,
  "products": [
    { "name": "Product B", "platform": "TikTok", "price": 120, "units": 2436, "revenue": 292320 }
  ],
  "platforms": [
    { "name": "Instagram", "reach": 2499361, "engagementRate": 198.0, "clicks": 98735, "conversions": 4938, "revenue": 342723, "roasSum": 221.6, "count": 60, "roas": 3.7 }
  ],
  "dailyRecords": [
    { "date": "2026-09-19", "product": "Product A", "platform": "Instagram", "price": 50, "units": 38, "revenue": 1900 }
  ],
  "alerts": [
    { "tone": "warning", "message": "Instagram conversion dipped 11% compared to last week." },
    { "tone": "success", "message": "Product B generated the highest average order value." },
    { "tone": "info",    "message": "TikTok continues to deliver the strongest engagement rate." }
  ]
}
```

---

## Validation Rules (Consumer‑Side)

1. **Required fields:** All top-level keys must be present and non‑null.
2. **Types:** Each field must match its declared type; `commissionRate` must be a `number` strictly between 0 and 1.
3. **Platform consistency:** Every `DailyRecord.platform` and `Product.platform` must appear in the `platforms` array by `name`.
4. **Date integrity:** All `DailyRecord.date` values must parse as ISO 8601 dates and fall within the implied period `[asOf - period, asOf]`.
5. **Non‑negative numerics:** All numeric fields (`price`, `units`, `revenue`, `reach`, etc.) must be >= 0.
6. **Alert tone enum:** `tone` must be one of `"warning"`, `"success"`, or `"info"`.

---

## In-Memory Filter Pipeline Contracts

The dashboard computes all filtered views client-side. These contracts describe the internal shapes used by the filter→aggregate→render pipeline.

### Filter Request

Describes the current filter state after a user interaction. Always derived from DOM elements — no server round trip.

```typescript
interface FilterRequest {
  /** Days to include: 0 = all data, 7|30|60 = last N days */
  daysBack: number;
  /** Selected platform name, or "all" for no filtering */
  platform: string;
  /** Product table search text (case-insensitive substring) */
  searchQuery: string;
  /** Sort key for product table: "revenue" | "name" | "units" | "commission" */
  sortKey: string;
}
```

**Default values:**

| Field | Default | Source |
|---|---|---|
| `daysBack` | `30` | `#period-filter` value |
| `platform` | `"all"` | `#platform-filter` value |
| `searchQuery` | `""` | `#product-search` value |
| `sortKey` | `"revenue"` | `#product-sort` value |

**Nullable / partial handling:**
- `daysBack`: `0` is valid (all data); `NaN` or negative → fall back to `30`.
- `platform`: `"all"` or missing → no platform filter applied.
- `searchQuery`: empty string → no text filter applied.
- `sortKey`: unrecognised value → fall back to `"revenue"`.

### Filter Response

The aggregated result returned by the client-side pipeline. **Not a network response** — computed synchronously in memory.

```typescript
interface FilterResponse {
  products:   ProductSummary[];  // Filtered + sorted product list
  platforms:  PlatformSummary[]; // Filtered platform aggregates
  summary:    Summary;           // KPI summary of filtered data
  chartData:  {
    revenue:  ChartRow[];        // Revenue per product for Chart.js
    funnel:   ChartRow[];        // Conversion funnel stages for Chart.js
  };
}
```

### Metrics (KPI) Contract

The shape returned by `summarize()`. All numeric fields are guaranteed to be valid numbers (never `NaN` or `Infinity`).

```typescript
interface Summary {
  revenue:         number;   // Total revenue — filtered platform sum
  sales:           number;   // Total units sold — filtered product sum
  commission:      number;   // revenue × commissionRate
  engagementRate:  number;   // Reach-weighted average (0–…, unclamped)
  reach:           number;   // Total reach of filtered platforms
  clicks:          number;   // Total clicks of filtered platforms
  conversions:     number;   // Total conversions of filtered platforms
}
```

**Edge-case values:**
- Empty filtered set → all fields are `0` (including engagement rate as `0`).
- Commission is calculated as `summary.revenue * data.commissionRate` — if revenue is `0`, commission is `0`.
- Engagement rate is reach-weighted: `sum(platform.reach * platform.engagementRate) / totalReach`. If `totalReach` is `0`, engagement rate is `0`.

### Chart Data Contract

The shape consumed by Chart.js and the accessible fallback table.

```typescript
interface ChartRow {
  label:  string;   // Bar label (HTML-escaped)
  value:  string;   // Formatted display value (e.g. "$4,000")
  amount: number;   // Raw numeric value for bar sizing
}
```

**Empty chart:** `ChartRow[]` of length `0` — renderers show `"No chart data available."`.
**Single row:** Length `1` — rendered as a single bar spanning the full width.