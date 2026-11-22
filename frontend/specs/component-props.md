# Component Props — Influencer Analytics Dashboard

> **Stage 2** · Catalogue of every interactive and presentation component, its props (HTML attributes / dataset properties / event bindings), and its role in the page.

---

## 1. Period Filter (`#period-filter`)

| Prop / Attribute | Type | Value / Binding |
|---|---|---|
| `tag` | `<select>` | — |
| `id` | `string` | `"period-filter"` |
| `aria-label` | `string` | `"Filter reporting period"` |
| `value` | `string` | One of `"7"`, `"30"`, `"60"`, `"all"` |
| `onchange` | event | Calls `render()` (closes over `rawData`, `chosenPlatform`) |

**Options rendered:** `Last 7 days`, `Last 30 days`, `Last 60 days`, `All available data`.

---

## 2. Platform Filter (`#platform-filter`)

| Prop / Attribute | Type | Value / Binding |
|---|---|---|
| `tag` | `<select>` | — |
| `id` | `string` | `"platform-filter"` |
| `aria-label` | `string` | `"Filter platform"` |
| `value` | `string` | Dynamically populated from `dailyRecords` |
| `onchange` | event | Sets `chosenPlatform`, then calls `render()` |

**Default option:** `<option value="all">All platforms</option>`.  
Additional options are added programmatically during `init()` by iterating `rawData.dailyRecords`.

---

## 3. Product Search (`#product-search`)

| Prop / Attribute | Type | Value / Binding |
|---|---|---|
| `tag` | `<input>` | — |
| `id` | `string` | `"product-search"` |
| `type` | `string` | `"text"` |
| `oninput` | event | Calls `render()` to filter product table |

**Filtering logic:** `filterAndSortProducts(products, query, sortKey)` uses case-insensitive substring matching on `product.name` and `product.platform`.

---

## 4. Product Sort (`#product-sort`)

| Prop / Attribute | Type | Value / Binding |
|---|---|---|
| `tag` | `<select>` | — |
| `id` | `string` | `"product-sort"` |
| `onchange` | event | Calls `render()` to re-sort product table |

**Options and sort keys:**

| Option | `sortKey` | Sort Direction |
|---|---|---|
| Revenue | `"revenue"` | Descending |
| Product name | `"name"` | Ascending (locale-aware) |
| Units sold | `"units"` | Descending |
| Commission | `"commission"` | Descending |

---

## 5. Product Table (`#product-rows`)

| Prop / Attribute | Type | Value / Binding |
|---|---|---|
| `tag` | `<tbody>` | — |
| `id` | `string` | `"product-rows"` |
| `innerHTML` | `string` | Set by `render()` — HTML rows or "No matching products." |

**Columns:** Product · Platform · Price · Units · Revenue · Commission · ROI.  
**Empty state:** Single row with `colspan="7"`.

---

## 6. Platform List (`#platform-list`)

| Prop / Attribute | Type | Value / Binding |
|---|---|---|
| `tag` | `<div>` | — |
| `id` | `string` | `"platform-list"` |
| `innerHTML` | `string` | Set by `render()` — cards or empty-state text |

Each card shows: platform name, ROAS, reach, and engagement rate.  
**Empty state:** `<p class="text-sm text-slate-500">No data for this period.</p>`

---

## 7. Top Platforms (`#top-platforms`)

| Prop / Attribute | Type | Value / Binding |
|---|---|---|
| `tag` | `<div>` | — |
| `id` | `string` | `"top-platforms"` |
| `innerHTML` | `string` | Set by `render()` — revenue-ranked platform rows |

**Empty state:** `<p class="text-sm text-slate-500">No data.</p>`

---

## 8. Quick Alerts (`#alerts-list`)

| Prop / Attribute | Type | Value / Binding |
|---|---|---|
| `tag` | `<ul>` | — |
| `id` | `string` | `"alerts-list"` |
| `innerHTML` | `string` | Set by `render()` from `rawData.alerts` |

Each alert is an `<li>` with a decorative `●` (aria-hidden), the alert message (escaped), and a tone-dependent colour.

---

## 9. KPI Display Elements

| ID | Content Set By | Format |
|---|---|---|
| `#kpi-commission` | `render()` | `formatCurrency(summary.commission, currency)` |
| `#kpi-sales` | `render()` | `summary.sales.toLocaleString("en-US")` |
| `#kpi-revenue` | `render()` | `formatCurrency(summary.revenue, currency)` |
| `#kpi-engagement` | `render()` | `` `${summary.engagementRate.toFixed(1)}%` `` |

**Empty/loading state:** All four show `"—"` in the initial HTML before data loads.

---

## 10. Data Status (`#data-status`)

| Prop / Attribute | Type | Value / Binding |
|---|---|---|
| `tag` | `<p>` | — |
| `id` | `string` | `"data-status"` |
| `role` | `string` | `"status"` |
| `aria-live` | `string` | `"polite"` |
| `textContent` | `string` | Updated by fetch promise chain |

**States:**
- Initial: `"Loading dashboard data…"`
- Success: `"Dashboard data loaded from local JSON."`
- Error: `` `Could not load dashboard data: ${error.message}` ``

---

## 11. Theme Toggle (`#theme-toggle`)

| Prop / Attribute | Type | Value / Binding |
|---|---|---|
| `tag` | `<button>` | — |
| `id` | `string` | `"theme-toggle"` |
| `type` | `string` | `"button"` |
| `aria-pressed` | `string` | `"true"` (dark) or `"false"` (light) |
| `textContent` | `string` | `"Dark mode"` or `"Light mode"` |
| `onclick` | event | Toggles `data-theme` on `<html>`, updates button text and `aria-pressed`, persists to `localStorage("dashboard-theme")` |

---

## 12. Lazy Chart Containers (`[data-lazy-chart]`)

| Dataset Prop | Type | Values |
|---|---|---|
| `data-lazy-chart` | `boolean` (presence) | — |
| `data-chart` | `string` | `"revenue"` or `"funnel"` |
| `data-values` | `string` (JSON) | Serialized `ChartRow[]` — updated by `render()` |

**Child elements:** `<canvas>`, `.chart-placeholder`, `.chart-source`, `table.sr-only[data-chart-data]`.  
**Observation:** An `IntersectionObserver` with `rootMargin: "160px"` triggers Chart.js initialisation when the element approaches the viewport.

---

## 13. Accessible Table (`[data-chart-data]`)

| Dataset Prop | Type | Value |
|---|---|---|
| `data-chart-data` | `boolean` (presence) | — |
| `className` | `string` | `"sr-only"` (visually hidden, screen-reader accessible) |
| `innerHTML` | `string` | Reset by `render()` with current filtered data rows |

The `<tbody>` content is rebuilt on every `render()` call with product or funnel rows matching the current filter state.

---

## 14. Dynamic Text Spans

| Selector | Content Set By | Example |
|---|---|---|
| `[data-source]` | `rawData.source || "local JSON sample"` | "local JSON sample" |
| `[data-period]` | `daysBack === 0 ? "All available data" : `Last ${daysBack} days`` | "Last 30 days" |
| `[data-as-of]` | `getAsOf().toLocaleDateString("en-US", …)` | "Nov 17, 2026" |