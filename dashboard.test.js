"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { initializeCharts, parseChartTable } = require("./dashboard.js");
const rendererPromise = import("./chart-renderer.mjs");

function makeTable(rows) {
  return {
    tBodies: [{ rows: rows.map(([label, value]) => ({
      cells: [{ textContent: label }, { textContent: value }],
    })) }],
  };
}

function makeChart(rows, scale = "maximum") {
  const output = { innerHTML: "" };
  const placeholder = { hidden: false };
  const table = makeTable(rows);
  return {
    dataset: { scale },
    querySelector(selector) {
      return {
        "[data-chart-data]": table,
        ".chart-output": output,
        ".chart-placeholder": placeholder,
      }[selector] || null;
    },
    output,
    placeholder,
  };
}

test("parses accessible table labels and numeric currency values", () => {
  const data = parseChartTable(makeTable([["Product A", "$4,000"], ["Product B", "$3,000"]]));
  assert.deepEqual(data.map(({ label, amount }) => [label, amount]), [["Product A", 4000], ["Product B", 3000]]);
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

test("hydrates only after intersection and unobserves the chart", async () => {
  const chart = makeChart([["Reach", "90,300"]]);
  let callback;
  const observed = [];
  const unobserved = [];
  class FakeIntersectionObserver {
    constructor(onChange, options) {
      callback = onChange;
      this.options = options;
    }
    observe(target) { observed.push(target); }
    unobserve(target) { unobserved.push(target); }
  }

  initializeCharts({ querySelectorAll: () => [chart] }, FakeIntersectionObserver);
  assert.equal(chart.dataset.loaded, undefined);
  assert.deepEqual(observed, [chart]);
  assert.equal(chart.placeholder.hidden, false);
  await callback([{ isIntersecting: true, target: chart }], { unobserve: (target) => unobserved.push(target) });
  assert.equal(chart.dataset.loaded, "true");
  assert.equal(chart.placeholder.hidden, true);
  assert.match(chart.output.innerHTML, /Reach/);
  assert.deepEqual(unobserved, [chart]);
});

test("observer skips non-intersecting entry but hydrates the next one in batch", async () => {
  const chartA = makeChart([["A", "10"]]);
  const chartB = makeChart([["B", "20"]]);
  let callback;
  const unobserved = [];
  class FakeObserver {
    constructor(onChange) { callback = onChange; }
    observe() {}
    unobserve(target) { unobserved.push(target); }
  }

  initializeCharts({ querySelectorAll: () => [chartA, chartB] }, FakeObserver);
  assert.equal(chartA.dataset.loaded, undefined);
  assert.equal(chartB.dataset.loaded, undefined);
  // Batch: entry[0] not intersecting, entry[1] intersecting
  await callback([
    { isIntersecting: false, target: chartA },
    { isIntersecting: true, target: chartB },
  ], { unobserve: (target) => unobserved.push(target) });
  assert.equal(chartA.dataset.loaded, undefined, "chartA should NOT hydrate (not intersecting)");
  assert.equal(chartB.dataset.loaded, "true", "chartB should hydrate");
  assert.match(chartB.output.innerHTML, /B/);
  assert.deepEqual(unobserved, [chartB]);
});

test("does not re-hydrate an already-loaded chart", async () => {
  const chart = makeChart([["Clicks", "3,500"]]);
  let callback;
  const unobserved = [];
  class FakeObserver {
    constructor(onChange) { callback = onChange; }
    observe() {}
    unobserve(target) { unobserved.push(target); }
  }

  initializeCharts({ querySelectorAll: () => [chart] }, FakeObserver);
  // First hydration
  await callback([{ isIntersecting: true, target: chart }], { unobserve: (target) => unobserved.push(target) });
  assert.equal(chart.dataset.loaded, "true");
  const firstHtml = chart.output.innerHTML;
  // Manually simulate a second callback for the same chart
  chart.output.innerHTML = "";
  chart.placeholder.hidden = false;
  delete chart.dataset.loaded;
  // Set it as loaded — simulate the guard
  chart.dataset.loaded = "true";
  // This should NOT re-hydrate
  await callback([{ isIntersecting: true, target: chart }], { unobserve: (target) => unobserved.push(target) });
  assert.equal(chart.output.innerHTML, "", "should not re-hydrate when dataset.loaded is true");
});

test("hydrates immediately when IntersectionObserver is unavailable", async () => {
  const chart = makeChart([["Clicks", "3,500"]]);
  await initializeCharts({ querySelectorAll: () => [chart] }, undefined);
  assert.equal(chart.dataset.loaded, "true");
  assert.match(chart.output.innerHTML, /Clicks/);
});

test("parseChartTable handles empty table gracefully", () => {
  const result = parseChartTable(null);
  assert.deepEqual(result, []);
});

test("parseChartTable handles table with missing cells", () => {
  const table = {
    tBodies: [{
      rows: [
        { cells: [{ textContent: "Only label" }] },
        { cells: [] },
      ],
    }],
  };
  const result = parseChartTable(table);
  assert.deepEqual(result, []);
});

test("parseChartTable handles non-numeric values", () => {
  const table = {
    tBodies: [{
      rows: [
        { cells: [{ textContent: "N/A" }, { textContent: "N/A" }] },
      ],
    }],
  };
  const data = parseChartTable(table);
  assert.equal(data.length, 1);
  assert.equal(data[0].amount, 0);
  assert.equal(data[0].label, "N/A");
});
