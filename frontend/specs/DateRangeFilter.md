# DateRangeFilter — Shared Component Specification

> **Stage 2** · Defines the shared `DateRangeFilter` component used across the dashboard to constrain displayed data to a reporting window.

---

## Overview

`DateRangeFilter` is a reusable, accessible date-range selector that controls the `period` dimension across all dashboard visualisations and tables. It is instantiated once in the page header and drives the `filterRecords()` → `aggregateProducts()` / `aggregatePlatforms()` pipeline.

---

## Current Implementation

The dashboard's period filter is a `<select>` element (`#period-filter`) in the page header:

```html
<label class="filter-control">Period
  <select id="period-filter" aria-label="Filter reporting period">
    <option value="7">Last 7 days</option>
    <option value="30">Last 30 days</option>
    <option value="60">Last 60 days</option>
    <option value="all">All available data</option>
  </select>
</label>
```

**Behaviour:**
- Changing the selection fires a `change` event that calls `render()`, which:
  1. Reads `daysBack` from the dropdown value (`0` for `"all"`, otherwise the numeric value).
  2. Calls `filterRecords(rawData.dailyRecords, daysBack)` to slice records.
  3. Re-aggregates products and platforms from the filtered records.
  4. Re-renders all KPIs, charts, tables, and platform cards.

---

## Props / Configuration

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` | `{ value: string, label: string }[]` | See options table | Available period choices |
| `initialValue` | `string` | `"30"` | Default selected period |
| `onChange` | `(daysBack: number \| "all") => void` | — | Callback when selection changes |

---

## Options

| Value | Label | Description |
|---|---|---|
| `"7"` | Last 7 days | Week-to-date view |
| `"30"` | Last 30 days | Monthly view (default) |
| `"60"` | Last 60 days | Extended reporting window |
| `"all"` | All available data | Full dataset, no date filter |

---

## Accessibility

- The `<select>` has an `aria-label="Filter reporting period"` attribute.
- When the selection changes and the dashboard re-renders, the `#data-status` element (`role="status"`, `aria-live="polite"`) announces the update.
- The period label element uses `.filter-control` styling with `font-size: 0.75rem` and `font-weight: 600` for legibility.

---

## Edge Cases

### 1. "All available data" selection

When the user selects `"all"`, `daysBack` is set to `0`, and `filterRecords` returns the full `dailyRecords` array unchanged. The period indicator displays `"All available data"` instead of `"Last N days"`.

```javascript
// dashboard.js line ~276
documentObject.querySelectorAll("[data-period]").forEach((item) => {
  item.textContent = daysBack === 0 ? "All available data" : `Last ${daysBack} days`;
});
```

### 2. Empty filtered dataset

If the selected period yields no matching records (e.g. a very short window with no data), `aggregateProducts` returns `[]` and `aggregatePlatforms` returns `[]`. The dashboard gracefully displays empty states:

- Product table: `<tr><td colspan="7">No matching products.</td></tr>`
- Platform list: `<p class="text-sm text-slate-500">No data for this period.</p>`
- KPI values: `$0`, `0`, `0.0%` (via `formatCurrency` / `.toLocaleString`)
- Charts: Both data tables and Chart.js instances receive empty arrays; the accessible table shows no rows, and Chart.js renders an empty canvas.

### 3. Rapid successive changes

The period filter uses a standard `<select>` `change` event. Since the event fires only on committed selections (not on every keypress), no debouncing is required. Each `change` triggers a full synchronous re-render, which is safe because all aggregation runs in-memory on the already-loaded `rawData`.

### 4. Non-numeric value handling

`daysBack` is computed as:
```javascript
const daysBack = elements.period.value === "all" ? 0 : Number(elements.period.value);
```
If a malformed option value is somehow introduced, `Number("invalid")` returns `NaN`. The `filterRecords` function would then call `setDate(getDate() - NaN)`, which results in an invalid `Date`. To guard against this, `Number()` conversion should validate that the result is a non-negative integer; otherwise fall back to `0`.

---

## Future Considerations

- **Custom date picker:** The current preset‑only dropdown could be extended with a start/end date input pair for ad‑hoc ranges.
- **URL syncing:** The selected period could be serialised as a query parameter (`?period=30`) for shareable dashboard states.
- **Preserve on navigation:** The selected period is currently held in the DOM only. If the dashboard gains client‑side routing, the value should persist via `localStorage` or session state.