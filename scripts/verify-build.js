"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "dashboard.css"), "utf8");
const js = fs.readFileSync(path.join(root, "dashboard.js"), "utf8");
const renderer = fs.readFileSync(path.join(root, "chart-renderer.mjs"), "utf8");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/dashboard.json"), "utf8"));

assert.match(html, /<title>Influencer Analytics Dashboard/);
assert.match(html, /<meta\s+name="description"/);
assert.match(html, /<script src="dashboard\.js" defer><\/script>/);
assert.match(html, /<link rel="stylesheet" href="dashboard\.css"/);
assert.equal((html.match(/data-lazy-chart/g) || []).length, 2);
assert.equal((html.match(/data-chart-data/g) || []).length, 2);
assert.match(js, /IntersectionObserver/);
assert.match(js, /chart\.js@4/);
assert.match(html, /id="theme-toggle"/);
assert.match(html, /id="product-search"/);
assert.match(html, /id="product-sort"/);
assert.equal(data.products.reduce((sum, item) => sum + item.revenue, 0), 292320 + 185040 + 125300);
assert.equal(data.products.reduce((sum, item) => sum + item.units, 0), 2436 + 2313 + 2506);
assert.ok(Array.isArray(data.dailyRecords));
assert.ok(data.dailyRecords.length > 0);
assert.match(renderer, /chart-rows/);
assert.match(css, /\.lazy-chart/);
console.log("Build verification passed: metadata and both accessible lazy charts are present.");
