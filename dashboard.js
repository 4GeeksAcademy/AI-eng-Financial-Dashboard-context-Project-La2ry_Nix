(function (root) {
  "use strict";

  /* ---- Hydration in-flight tracker (idempotency) ---- */
  const loading = new WeakMap();

  /* ---- Safely parse a <table data-chart-data> ---- */
  function parseChartTable(table) {
    if (!table || !table.tBodies || !table.tBodies[0] || !table.tBodies[0].rows) return [];
    return Array.from(table.tBodies[0].rows, (row) => {
      if (!row.cells || row.cells.length < 2) return null;
      const raw = row.cells[1].textContent.trim();
      const parsed = Number(raw.replace(/[^0-9.-]/g, ""));
      return {
        label: (row.cells[0].textContent || "").trim(),
        value: raw,
        amount: Number.isFinite(parsed) ? parsed : 0,
      };
    }).filter(Boolean);
  }

  /* ---- Hydrate a single lazy-chart element ---- */
  async function hydrateChart(chart, loadRenderer) {
    if (chart.dataset.loaded === "true" || loading.get(chart)) return;
    const table = chart.querySelector("[data-chart-data]");
    const output = chart.querySelector(".chart-output");
    const placeholder = chart.querySelector(".chart-placeholder");
    if (!table || !output || !placeholder) return;

    loading.set(chart, true);
    try {
      const data = parseChartTable(table);
      const renderer = await loadRenderer();
      output.innerHTML = renderer.renderChart(data, chart.dataset.scale);
      placeholder.hidden = true;
      chart.dataset.loaded = "true";
    } finally {
      loading.set(chart, false);
    }
  }

  /* ---- Set up lazy loading via IntersectionObserver ---- */
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
