(function (root) {
  "use strict";

  function parseChartTable(table) {
    return Array.from(table.tBodies[0].rows, (row) => ({
      label: row.cells[0].textContent.trim(),
      value: row.cells[1].textContent.trim(),
      amount: Number(row.cells[1].textContent.replace(/[^0-9.-]/g, "")) || 0,
    }));
  }

  async function hydrateChart(chart, loadRenderer) {
    const table = chart.querySelector("[data-chart-data]");
    const output = chart.querySelector(".chart-output");
    const placeholder = chart.querySelector(".chart-placeholder");
    if (!table || !output || !placeholder) return;

    const renderer = await loadRenderer();
    output.innerHTML = renderer.renderChart(parseChartTable(table), chart.dataset.scale);
    placeholder.hidden = true;
    chart.dataset.loaded = "true";
  }

  function initializeCharts(documentObject, Observer, loadRenderer = () => import("./chart-renderer.mjs")) {
    const charts = Array.from(documentObject.querySelectorAll("[data-lazy-chart]"));
    if (!charts.length) return Promise.resolve();
    if (!Observer) {
      return Promise.all(charts.map((chart) => hydrateChart(chart, loadRenderer)));
    }

    const observer = new Observer(async (entries, activeObserver) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        await hydrateChart(entry.target, loadRenderer);
        activeObserver.unobserve(entry.target);
      }
    }, { rootMargin: "160px" });
    charts.forEach((chart) => observer.observe(chart));
    return observer;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { initializeCharts, parseChartTable };
  }
  if (root && root.document) {
    initializeCharts(root.document, root.IntersectionObserver);
  }
})(typeof window !== "undefined" ? window : null);
