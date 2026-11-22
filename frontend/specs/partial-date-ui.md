# Partial-Date UI — Influencer Analytics Dashboard

> **Stage 2** · Documents how dates are displayed, formatted, and handled across the dashboard, including edge cases for incomplete or ambiguous date information.

---

## Date Formats Used

| Context | Format | Example | Source |
|---|---|---|---|
| `asOf` display (`[data-as-of]`) | `"MMM D, YYYY"` (via `toLocaleDateString`) | `"Nov 17, 2026"` | `getAsOf().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })` |
| Period label (`[data-period]`) | `"Last N days"` or `"All available data"` | `"Last 30 days"` | Conditional string interpolation |
| Data payload `asOf` | ISO 8601 date | `"2026-11-17"` | `data/dashboard.json` |
| Data payload `period` | Human-readable string | `"Last 60 days"` | `data/dashboard.json` |
| `DailyRecord.date` | ISO 8601 date | `"2026-09-19"` | `data/dashboard.json` |
| Chart source line | Combined: source · period · snapshot | `"Source: local JSON · Period: Last 30 days · Snapshot: Nov 17, 2026"` | Template in `index.html` |

---

## Date Calculation Pipeline

```
User selects period ("30" / "60" / "7" / "all")
        │
        ▼
daysBack = Number(period.value) or 0 for "all"
        │
        ▼
cutoff = getAsOf()        // new Date("2026-11-17T00:00:00")
cutoff.setDate(day - daysBack)
cutoffStr = cutoff.toISOString().slice(0, 10)   // e.g. "2026-10-18"
        │
        ▼
records.filter(rec => rec.date >= cutoffStr)    // string comparison on ISO dates
```

---

## UI Display Components

### Snapshot date (`[data-as-of]`)

Appears on chart source lines and the data status message. Formatted as a shortened month + day + full year to remain compact alongside other metadata.

### Period label (`[data-period]`)

Describes the active filter in human terms. The label appears on each chart's source line to give quick context without reading the filter control.

### Data status (`#data-status`)

A live region (`role="status"`, `aria-live="polite"`) that announces when data loads but does not repeat the full date — the chart source lines carry that detail.

---

## Edge Cases

### 1. Date value that is not a valid ISO date string

If a `DailyRecord.date` is missing, malformed, or `null`, `filterRecords` performs a string comparison (`rec.date >= cutoffStr`). In JavaScript:
- `null >= "2026-10-18"` → `false` (coerces `null` → `0`, then `"0" >= "2026-10-18"` is `false`)
- `undefined >= "2026-10-18"` → `false`
- `"" >= "2026-10-18"` → `false`
- A non-date string like `"invalid" >= "2026-10-18"` → `false` (lexicographic comparison)

**Result:** Invalid dates are silently excluded from results. To improve robustness, `filterRecords` should validate that `rec.date` matches `/^\d{4}-\d{2}-\d{2}$/` before comparing, and log a warning for mismatches.

### 2. Future-dated daily records

If a `DailyRecord.date` falls after `getAsOf()` (e.g. `"2026-11-20"` when `asOf` is `"2026-11-17"`), that record passes the `>= cutoffStr` filter if `daysBack` includes that date. Since the date comparison is a simple string comparison on ISO strings, a future date will sort/larger correctly.

**UI impact:** Records with future dates will be aggregated into KPIs and charts. No explicit validation prevents this. A defensive check could skip records where `date > asOf`.

### 3. Time component in date strings

The current `dailyRecords` use clean ISO date strings (`"2026-09-19"`), but if a datetime string like `"2026-09-19T12:00:00"` were introduced:
- `filterRecords` compares `"2026-09-19T12:00:00" >= "2026-10-18"` → lexicographic comparison still works because `T` (ASCII 84) > `-` (ASCII 45), so datetime strings will correctly sort after plain dates.
- However, if `rec.date` contains a timezone offset (`"2026-09-19T12:00:00Z"`), the string comparison remains correct for UTC-based sorting.

**Recommendation:** The data contract should enforce ISO 8601 date-only format (`YYYY-MM-DD`). The frontend should coerce via `rec.date.slice(0, 10)` to strip any time component before comparison.

### 4. Edge of month / month-boundary display

The `asOf` date (`"Nov 17, 2026"`) uses `"short"` month format. The `toLocaleDateString` output is locale-dependent. For `"en-US"` this produces `"Nov 17, 2026"`.

**Key dates at month boundaries:**
- `"2026-10-01"` → `"Oct 1, 2026"`
- `"2026-01-01"` → `"Jan 1, 2026"`
- `"2026-12-31"` → `"Dec 31, 2026"`

These all render consistently. No special handling required.

### 5. Single-day period

If the period dropdown were extended with a `"1"` option (Last 24 hours):
- `daysBack = 1`
- `cutoff = 2026-11-16`
- Only records with `date >= "2026-11-16"` would appear
- The period label would read `"Last 1 days"` (grammar issue: should be `"Last 1 day"`)

**Recommendation:** When `daysBack === 1`, format the period label as `"Last 1 day"` instead of `"Last 1 days"`.

---

## Non-Date Edge Cases in the Date Pipeline

### Records with no date field at all

```javascript
function filterRecords(records, daysBack) {
  if (daysBack === 0) return records;
  // ...
  return records.filter((rec) => rec.date >= cutoffStr);
}
```

If a record object is missing the `date` key entirely, `rec.date` is `undefined`, and `undefined >= cutoffStr` is `false`. This silently drops the record. The data contract should mandate that `date` is present on every `DailyRecord`; the frontend could add a guard:

```javascript
records.filter((rec) => rec.date && rec.date >= cutoffStr)
```

### Mixed date string and numeric year formats

If a record accidentally uses `2026` (number) instead of `"2026-11-17"` (string):
- `2026 >= "2026-10-18"` → JavaScript coerces the string to a number: `2026 >= NaN` → `false`.
- The record is silently dropped.

Enforcing `typeof rec.date === "string"` in data validation prevents this class of bug.