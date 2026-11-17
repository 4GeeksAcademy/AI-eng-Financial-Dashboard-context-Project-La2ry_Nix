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
