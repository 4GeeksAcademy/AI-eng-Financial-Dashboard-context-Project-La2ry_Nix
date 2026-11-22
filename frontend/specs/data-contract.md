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