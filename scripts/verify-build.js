"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "dashboard.css"), "utf8");
const js = fs.readFileSync(path.join(root, "dashboard.js"), "utf8");
const renderer = fs.readFileSync(path.join(root, "chart-renderer.mjs"), "utf8");

assert.match(html, /<title>Influencer Analytics Dashboard/);
assert.match(html, /<meta\s+name="description"/);
assert.match(html, /<script src="dashboard\.js" defer><\/script>/);
assert.match(html, /<link rel="stylesheet" href="dashboard\.css"/);
assert.equal((html.match(/data-lazy-chart/g) || []).length, 2);
assert.equal((html.match(/data-chart-data/g) || []).length, 2);
assert.match(js, /IntersectionObserver/);
assert.match(js, /import\("\.\/chart-renderer\.mjs"\)/);
assert.doesNotMatch(js, /chart-rows|chart-bar/);
assert.match(renderer, /chart-rows/);
assert.match(css, /\.lazy-chart/);
console.log("Build verification passed: metadata and both accessible lazy charts are present.");
