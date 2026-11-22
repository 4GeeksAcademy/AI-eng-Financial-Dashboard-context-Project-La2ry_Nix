"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { filterAndSortProducts, formatCurrency, initializeCharts, parseChartTable, summarize, aggregateProducts, aggregatePlatforms, filterRecords } = require("./dashboard.js");
const rendererPromise = import("./chart-renderer.mjs");

test("parses accessible table labels and numeric currency values", () => {
  const table = { tBodies: [{ rows: [["Product A", "$4,000"], ["Product B", "$3,000"]].map(([label, value]) => ({ cells: [{ textContent: label }, { textContent: value }] })) }] };
  const data = parseChartTable(table);
  assert.deepEqual(data.map(({ label, amount }) => [label, amount]), [["Product A", 4000], ["Product B", 3000]]);
});

test("calculates revenue, sales, commission, and reach-weighted engagement", () => {
  const data = {
    commissionRate: 0.15,
    products: [
      { revenue: 100, units: 2 },
      { revenue: 200, units: 3 },
    ],
    platforms: [
      { reach: 100, engagementRate: 10, clicks: 20, conversions: 4 },
      { reach: 300, engagementRate: 6, clicks: 30, conversions: 6 },
    ],
  };
  assert.deepEqual(summarize(data), {
    revenue: 300,
    sales: 5,
    commission: 45,
    engagementRate: 7,
    reach: 400,
    clicks: 50,
    conversions: 10,
  });
});

test("filters by product or platform and sorts without mutating data", () => {
  const products = [
    { name: "Alpha", platform: "Instagram", revenue: 50, units: 2, commission: 5 },
    { name: "Beta", platform: "TikTok", revenue: 100, units: 1, commission: 10 },
  ];
  assert.deepEqual(filterAndSortProducts(products, "tiktok", "revenue").map(({ name }) => name), ["Beta"]);
  assert.deepEqual(filterAndSortProducts(products, "", "name").map(({ name }) => name), ["Alpha", "Beta"]);
  assert.equal(products[0].name, "Alpha");
});

test("renders proportional bars and escapes labels", async () => {
  const { renderChart } = await rendererPromise;
  const html = renderChart([
    { label: "A&B", value: "$4", amount: 4 },
    { label: "B", value: "$2", amount: 2 },
  ], "total");
  assert.match(html, /A&amp;B/);
  assert.match(html, /width:66\.66666666666666%/);
  assert.match(html, /width:33\.33333333333333%/);
  assert.doesNotMatch(html, /A&B/);
});

test("renders an explicit empty-data state", async () => {
  const { renderChart } = await rendererPromise;
  assert.match(renderChart([], "maximum"), /No chart data available/);
});

test("keeps zero-valued bars at a safe minimum width", async () => {
  const { renderChart } = await rendererPromise;
  const html = renderChart([{ label: "No sales", value: "$0", amount: 0 }], "maximum");
  assert.match(html, /width:0%/);
  assert.match(html, /class="chart-bar"/);
});

test("formats currency with Intl.NumberFormat", () => {
  assert.equal(formatCurrency(0), "$0");
  assert.equal(formatCurrency(1494), "$1,494");
  assert.equal(formatCurrency(9960), "$9,960");
});

test("initializeCharts delegates to Observer and does not error for empty chart list", () => {
  assert.ok(initializeCharts({ querySelectorAll: () => [] }, null) instanceof Map);
});

test("filterRecords returns only records within daysBack window", () => {
  const records = [
    { date: "2026-10-01", product: "A" },
    { date: "2026-10-28", product: "B" },
    { date: "2026-11-17", product: "C" },
  ];
  const result = filterRecords(records, 20);
  assert.equal(result.length, 2);
  assert.equal(result[0].product, "B");
  assert.equal(result[1].product, "C");
});

test("aggregateProducts sums revenue and units from daily records", () => {
  const records = [
    { product: "X", platform: "IG", price: 50, units: 10, revenue: 500 },
    { product: "X", platform: "IG", price: 50, units: 5, revenue: 250 },
    { product: "Y", platform: "TK", price: 100, units: 3, revenue: 300 },
  ];
  const result = aggregateProducts(records);
  assert.equal(result.length, 2);
  const x = result.find((p) => p.name === "X");
  assert.equal(x.units, 15);
  assert.equal(x.revenue, 750);
});

test("aggregatePlatforms averages engagement and roas from daily records", () => {
  const records = [
    { platform: "IG", reach: 1000, engagementRate: 5, clicks: 50, conversions: 4, revenue: 200, roas: 2 },
    { platform: "IG", reach: 2000, engagementRate: 7, clicks: 80, conversions: 6, revenue: 400, roas: 3 },
    { platform: "TK", reach: 3000, engagementRate: 8, clicks: 120, conversions: 10, revenue: 600, roas: 4 },
  ];
  const result = aggregatePlatforms(records);
  assert.equal(result.length, 2);
  const ig = result.find((p) => p.name === "IG");
  assert.equal(ig.reach, 3000);
  assert.equal(ig.engagementRate, 6);
  assert.equal(ig.roas, 2.5);
});
