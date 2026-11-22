# Influencer Analytics Dashboard

A responsive creator analytics dashboard for reviewing commissions, product revenue, conversions, and platform performance. Built with semantic HTML, Tailwind utility classes, vanilla JavaScript, local JSON data, and on-demand Chart.js charts.

## Features

- **KPI overview:** Revenue, sales, commissions, and reach-weighted engagement calculated from the same dataset.
- **Chart.js visualizations:** Revenue comparison and conversion funnel, initialized near the viewport. Each chart has an accessible data-table equivalent and a sample-data source/date note.
- **JSON data source:** `data/dashboard.json` is fetched at runtime, with a status message if loading fails.
- **Filtering and sorting:** Filter products by product/platform text, sort by revenue/name/units/commission, and narrow KPI and chart values by platform.
- **Theme switch:** Light and dark themes, with selection persisted in local storage.
- **Responsive layout:** Dashboard cards and controls adapt to mobile and desktop widths.

## Preview

Run the Flask preview server from the repository root:

```bash
pip3 install Flask
python3 server.py
```

Then open the forwarded port `3000`. The dashboard loads JSON and Chart.js over HTTP; opening `index.html` directly as a `file://` URL is not supported.

## Data and calculations

Edit `data/dashboard.json` to update products, platforms, alerts, reporting period, and commission rate. The figures are illustrative sample data, not a live account integration.

- Product commission = revenue × commission rate.
- Revenue and sales KPIs sum values for the active platform filter.
- Engagement rate is weighted by platform reach, rather than averaging rates equally.
- Funnel totals reflect the selected platform(s).

## Edge cases

### KPI overview

1. **Zero revenue period:** If the selected date range contains no sales data, KPIs display `$0`, `0`, `0.0%` — they never show `NaN`, `undefined`, or stale values from a previous render. The commission calculation (`revenue × commissionRate`) safely produces `0`.
2. **Extremely high engagement rate:** If a platform's `engagementRate` exceeds the typical 0–100% range (e.g. the sample data contains `198.0`), the dashboard renders it verbatim with one decimal place. No clamping or capping is applied — the raw calculated value is always shown.

### Chart.js visualizations

1. **Empty chart data:** When filtered records produce zero products or funnel stages, `renderChart([], …)` returns an explicit `<p class="text-sm text-slate-500">No chart data available.</p>` message. Chart.js receives `labels: []` and `data: []` and renders a blank canvas; no JavaScript error occurs.
2. **IntersectionObserver not available:** If the browser lacks `IntersectionObserver` (legacy browsers), `initializeCharts` falls back by calling `queue()` synchronously on every chart element — all charts render immediately without lazy-loading. The `chart-placeholder` elements are hidden on success.

### JSON data source

1. **HTTP fetch failure:** If `data/dashboard.json` returns a non-OK status or the network is unreachable, the catch handler sets `#data-status` to `` `Could not load dashboard data: ${error.message}` `` and rethrows the error. All KPI placeholders remain as `"—"` and chart areas show their loading placeholders indefinitely.
2. **Malformed JSON payload:** If the server returns an unparseable response, `response.json()` rejects and the same catch handler fires. No partial rendering occurs — the dashboard stays in its initial loading state until the page is refreshed.

### Filtering and sorting

1. **No matching products:** A search query that matches zero rows renders `<tr><td colspan="7">No matching products.</td></tr>` in the product table. The platform list, KPIs, and charts continue to reflect the broader filtered dataset — the empty table is scoped to the search only.
2. **Platform filter with no data:** Selecting a platform that has no records for the chosen period displays `"No data for this period."` in the platform list and `"No data."` in the top-platforms section. KPIs and charts recalculate against an empty effective dataset and show zeroed values.

### Period filter

1. **"All available data" selected:** This sets `daysBack = 0`, which causes `filterRecords` to return the full `dailyRecords` array unchanged. The period label displays `"All available data"` instead of `"Last N days"`.
2. **Rapid successive changes:** Each `change` event on the `<select>` triggers a synchronous re-render. Since all aggregation runs in-memory on already-loaded `rawData`, no debouncing or batching is necessary — even rapid switching is instantaneous and glitch-free.

### Theme switch

1. **localStorage unavailable:** If `localStorage` is blocked (e.g. private browsing mode in some configurations), the `storage?.getItem` and `storage?.setItem` calls use optional chaining and fail silently. The theme toggle still works for the current session, but the preference is not persisted across page loads.
2. **System preference mismatch:** The initial theme defaults to `"light"` regardless of `prefers-color-scheme`. If the user prefers dark mode system-wide, they must toggle manually on each first visit. A future enhancement could check `matchMedia("(prefers-color-scheme: dark)")` for the initial value.

### Responsive layout

1. **Very narrow viewport (< 400 px):** The grid layout collapses to a single column. Filter controls and the theme button wrap to multiple lines inside the header. The product table becomes horizontally scrollable (`overflow-x-auto`) to prevent content clipping.
2. **Print rendering:** The dashboard uses `min-h-screen` and relies on JavaScript for data. When printed, only the initial HTML shell (with `"—"` placeholders) is rendered — the fetched data and chart canvases do not appear. A print stylesheet improvement could pre-render the accessible data tables for printed output.

## Development checks

```bash
npm run lint
npm test
npm run build
```

## Screenshots

Screenshots are not checked into the repository yet. After previewing the page at desktop and mobile widths, add captures such as `docs/screenshots/dashboard-desktop.png` and embed them here:

```md
![Dashboard desktop screenshot](docs/screenshots/dashboard-desktop.png)
```

## Deploy to GitHub Pages

This is a static site and needs no build output. In repository **Settings → Pages**, choose **Deploy from a branch**, then select the branch approved for publishing and `/ (root)`. Ensure `index.html`, `dashboard.js`, `dashboard.css`, and `data/dashboard.json` are all included in that published branch. The dashboard uses a CDN Chart.js module; deployment needs network access to that CDN.
