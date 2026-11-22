const COLORS = ["#8b5cf6", "#6366f1", "#0ea5e9", "#10b981", "#f59e0b"];

const escapeHtml = globalThis.escapeHtml || (function () {
  "use strict";
  return function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  };
})();

export function renderChart(data, scale) {
  if (!data.length) return '<p class="text-sm text-slate-500">No chart data available.</p>';
  const denominator = scale === "total"
    ? data.reduce((sum, item) => sum + item.amount, 0)
    : Math.max(...data.map((item) => item.amount));

  return `<div class="chart-rows">${data.map((item, index) => {
    const width = denominator > 0 ? Math.max(0, (item.amount / denominator) * 100) : 0;
    const label = escapeHtml(item.label);
    const value = escapeHtml(item.value);
    const color = COLORS[index % COLORS.length];
    return `<div class="chart-row"><div class="chart-row-heading"><span>${label}</span><span class="chart-row-value">${value}</span></div><div class="chart-track"><div class="chart-bar" style="width:${width}%;background-color:${color}"></div></div></div>`;
  }).join("")}</div>`;
}
