(function (root) {
  "use strict";

  const escapeHtml = root.escapeHtml || function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  };

  const formatCurrency = (amount, currency = "USD") => new Intl.NumberFormat("en-US", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(amount);

  function summarize(data, products = data.products, platforms = data.platforms) {
    const revenue = products.reduce((sum, product) => sum + product.revenue, 0);
    const sales = products.reduce((sum, product) => sum + product.units, 0);
    const reach = platforms.reduce((sum, platform) => sum + platform.reach, 0);
    const weightedEngagement = platforms.reduce((sum, platform) => sum + platform.reach * platform.engagementRate, 0);
    return {
      revenue,
      sales,
      commission: Math.round((revenue * data.commissionRate + Number.EPSILON) * 100) / 100,
      engagementRate: reach ? weightedEngagement / reach : 0,
      reach,
      clicks: platforms.reduce((sum, platform) => sum + platform.clicks, 0),
      conversions: platforms.reduce((sum, platform) => sum + platform.conversions, 0),
    };
  }

  function filterAndSortProducts(products, query, sortKey) {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return products
      .filter((product) => `${product.name} ${product.platform}`.toLocaleLowerCase().includes(normalizedQuery))
      .slice()
      .sort((a, b) => sortKey === "name"
        ? a.name.localeCompare(b.name)
        : (b[sortKey] || 0) - (a[sortKey] || 0));
  }

  function parseChartTable(table) {
    return Array.from(table.tBodies[0].rows, (row) => ({
      label: row.cells[0].textContent.trim(),
      value: row.cells[1].textContent.trim(),
      amount: Number(row.cells[1].textContent.replace(/[^0-9.-]/g, "")) || 0,
    }));
  }

  function initializeCharts(documentObject, Observer, loadChartJs = () => import("https://cdn.jsdelivr.net/npm/chart.js@4.4.7/auto/+esm")) {
    const charts = Array.from(documentObject.querySelectorAll("[data-lazy-chart]"));
    const chartInstances = new Map();
    const queue = (element) => {
      if (chartInstances.has(element)) return;
      loadChartJs().then(({ default: Chart }) => {
        const source = JSON.parse(element.dataset.values || "[]");
        const chart = new Chart(element.querySelector("canvas"), {
          type: "bar",
          data: {
            labels: source.map((item) => item.label),
            datasets: [{
              label: element.dataset.chart === "revenue" ? "Revenue (USD)" : "People",
              data: source.map((item) => item.value),
              backgroundColor: ["#8b5cf6", "#0891b2", "#10b981"],
              borderRadius: 7,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
          },
        });
        chartInstances.set(element, chart);
        element.querySelector(".chart-placeholder").hidden = true;
      }).catch(() => {
        element.querySelector(".chart-placeholder").textContent = "Chart unavailable; use the accessible data table below.";
      });
    };
    if (!Observer) {
      charts.forEach(queue);
      return chartInstances;
    }
    const observer = new Observer((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        queue(entry.target);
        observer.unobserve(entry.target);
      });
    // Trigger charts ~160px before the element comes into view, so Chart.js
    // module loading and canvas rendering finish before the user scrolls there.
    }, { rootMargin: "160px" });
    charts.forEach((chart) => observer.observe(chart));
    return chartInstances;
  }

  function getAsOf() { return new Date("2026-11-17T00:00:00"); }

  function filterRecords(records, daysBack) {
    if (daysBack === 0) return records;
    const cutoff = getAsOf();
    cutoff.setDate(cutoff.getDate() - daysBack);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return records.filter((rec) => rec.date >= cutoffStr);
  }

  function aggregateProducts(records) {
    const map = {};
    for (const rec of records) {
      if (!rec.product) continue;
      const key = rec.product;
      if (!map[key]) map[key] = { name: rec.product, platform: rec.platform, price: rec.price, units: 0, revenue: 0 };
      map[key].units += rec.units;
      map[key].revenue += rec.revenue;
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }

  function aggregatePlatforms(records) {
    const map = {};
    for (const rec of records) {
      if (!rec.platform) continue;
      const key = rec.platform;
      if (!map[key]) map[key] = { name: rec.platform, reach: 0, engagementRateSum: 0, clicks: 0, conversions: 0, revenue: 0, roasSum: 0, count: 0 };
      map[key].reach += rec.reach;
      map[key].engagementRateSum += rec.engagementRate;
      map[key].clicks += rec.clicks;
      map[key].conversions += rec.conversions;
      map[key].revenue += rec.revenue;
      map[key].roasSum += rec.roas;
      map[key].count += 1;
    }
    return Object.values(map).map((item) => ({
      ...item,
      engagementRate: item.count > 0 ? Math.round((item.engagementRateSum / item.count) * 10) / 10 : 0,
      roas: item.count > 0 ? Math.round((item.roasSum / item.count) * 10) / 10 : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }

  function init(documentObject, fetchFunction = fetch, storage = root.localStorage) {
    const elements = {
      rows: documentObject.querySelector("#product-rows"),
      search: documentObject.querySelector("#product-search"),
      sort: documentObject.querySelector("#product-sort"),
      platform: documentObject.querySelector("#platform-filter"),
      period: documentObject.querySelector("#period-filter"),
      status: documentObject.querySelector("#data-status"),
      theme: documentObject.querySelector("#theme-toggle"),
    };
    let rawData;
    let chartInstances;
    let chosenPlatform = "all";

    function render() {
      if (!rawData) return;
      const daysBack = elements.period.value === "all" ? 0 : Number(elements.period.value);
      const records = filterRecords(rawData.dailyRecords, daysBack);
      const products = aggregateProducts(records);
      const platforms = aggregatePlatforms(records);

      const effectiveProducts = chosenPlatform === "all" ? products : products.filter((item) => item.platform === chosenPlatform);
      const effectivePlatforms = chosenPlatform === "all" ? platforms : platforms.filter((item) => item.name === chosenPlatform);
      const summary = summarize(rawData, effectiveProducts, effectivePlatforms);

      documentObject.querySelector("#kpi-commission").textContent = formatCurrency(summary.commission, rawData.currency);
      documentObject.querySelector("#kpi-sales").textContent = summary.sales.toLocaleString("en-US");
      documentObject.querySelector("#kpi-revenue").textContent = formatCurrency(summary.revenue, rawData.currency);
      documentObject.querySelector("#kpi-engagement").textContent = `${summary.engagementRate.toFixed(1)}%`;

      const filtered = filterAndSortProducts(effectiveProducts, elements.search.value, elements.sort.value);
      elements.rows.innerHTML = filtered.length ? filtered.map((product) => {
        const commission = product.revenue * rawData.commissionRate;
        const roi = product.revenue ? (product.revenue / commission).toFixed(1) : "0.0";
        return `<tr><td class="px-5 py-4 font-medium">${escapeHtml(product.name)}</td><td class="px-5 py-4">${escapeHtml(product.platform)}</td><td class="px-5 py-4">${formatCurrency(product.price, rawData.currency)}</td><td class="px-5 py-4">${product.units}</td><td class="px-5 py-4">${formatCurrency(product.revenue, rawData.currency)}</td><td class="px-5 py-4 font-semibold">${formatCurrency(commission, rawData.currency)}</td><td class="px-5 py-4">${roi}x</td></tr>`;
      }).join("") : '<tr><td class="px-5 py-4" colspan="7">No matching products.</td></tr>';

      documentObject.querySelector("#platform-list").innerHTML = effectivePlatforms.length ? effectivePlatforms.map((item) => `<div class="rounded-xl bg-slate-50 p-3"><div class="flex justify-between text-sm"><span class="font-medium">${escapeHtml(item.name)}</span><span class="font-semibold">${item.roas.toFixed(1)}x</span></div><p class="mt-2 text-xs">${item.reach.toLocaleString("en-US")} reach · ${item.engagementRate.toFixed(1)}% engagement</p></div>`).join("") : '<p class="text-sm text-slate-500">No data for this period.</p>';
      documentObject.querySelector("#top-platforms").innerHTML = effectivePlatforms.length ? effectivePlatforms.slice().sort((a, b) => b.revenue - a.revenue).map((item) => `<div class="flex justify-between"><span>${escapeHtml(item.name)}</span><span class="font-semibold">${formatCurrency(item.revenue, rawData.currency)}</span></div>`).join("") : '<p class="text-sm text-slate-500">No data.</p>';
      documentObject.querySelector("#alerts-list").innerHTML = rawData.alerts.map((alert) => `<li class="flex items-start gap-3 rounded-xl bg-slate-50 p-3"><span aria-hidden="true">●</span><span>${escapeHtml(alert.message)}</span></li>`).join("");

      documentObject.querySelectorAll("[data-chart-data]").forEach((table) => {
        const chartElement = table.closest("[data-lazy-chart]");
        const rows = chartElement.dataset.chart === "revenue"
          ? effectiveProducts.map((item) => [item.name, formatCurrency(item.revenue, rawData.currency)])
          : [["Reach", summary.reach.toLocaleString("en-US")], ["Clicks", summary.clicks.toLocaleString("en-US")], ["Conversions", summary.conversions.toLocaleString("en-US")]];
        table.tBodies[0].innerHTML = rows.map(([label, value]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("");
        chartElement.dataset.values = JSON.stringify(rows.map(([label, value]) => ({ label, value: Number(value.replace(/[^0-9.-]/g, "")) || 0 })));
        if (chartInstances?.has(chartElement)) {
          const chart = chartInstances.get(chartElement);
          chart.data.labels = rows.map(([label]) => label);
          chart.data.datasets[0].data = rows.map(([, value]) => Number(value.replace(/[^0-9.-]/g, "")) || 0);
          chart.update();
        }
      });
      documentObject.querySelectorAll("[data-source]").forEach((item) => { item.textContent = rawData.source || "local JSON sample"; });
      documentObject.querySelectorAll("[data-period]").forEach((item) => {
        item.textContent = daysBack === 0 ? "All available data" : `Last ${daysBack} days`;
      });
      documentObject.querySelectorAll("[data-as-of]").forEach((item) => {
        item.textContent = getAsOf().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
      });
    }

    elements.search.addEventListener("input", render);
    elements.sort.addEventListener("change", render);
    elements.platform.addEventListener("change", () => { chosenPlatform = elements.platform.value; render(); });
    elements.period.addEventListener("change", render);
    const initialTheme = storage?.getItem("dashboard-theme") || "light";
    documentObject.documentElement.dataset.theme = initialTheme;
    elements.theme.textContent = initialTheme === "dark" ? "Light mode" : "Dark mode";
    elements.theme.setAttribute("aria-pressed", String(initialTheme === "dark"));
    elements.theme.addEventListener("click", () => {
      const next = documentObject.documentElement.dataset.theme === "dark" ? "light" : "dark";
      documentObject.documentElement.dataset.theme = next;
      elements.theme.textContent = next === "dark" ? "Light mode" : "Dark mode";
      elements.theme.setAttribute("aria-pressed", String(next === "dark"));
      storage?.setItem("dashboard-theme", next);
    });

    return fetchFunction("data/dashboard.json")
      .then((response) => {
        if (!response.ok) throw new Error(`Data request failed (${response.status})`);
        return response.json();
      })
      .then((loaded) => {
        rawData = loaded;
        const seen = new Set();
        for (const rec of rawData.dailyRecords) {
          if (rec.platform && !seen.has(rec.platform)) {
            seen.add(rec.platform);
            if (!Array.from(elements.platform.options).some((option) => option.value === rec.platform)) {
              elements.platform.add(new Option(rec.platform, rec.platform));
            }
          }
        }
        elements.status.textContent = "Dashboard data loaded from local JSON.";
        chartInstances = initializeCharts(documentObject, root.IntersectionObserver);
        render();
        return loaded;
      })
      .catch((error) => {
        elements.status.textContent = `Could not load dashboard data: ${error.message}`;
        throw error;
      });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { aggregatePlatforms, aggregateProducts, filterAndSortProducts, filterRecords, formatCurrency, init, initializeCharts, parseChartTable, summarize };
  }
  if (root?.document) init(root.document);
})(typeof window !== "undefined" ? window : globalThis);
