"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

function localScripts(html) {
  return [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
    .map(match => match[1])
    .filter(src => !/^(?:[a-z]+:)?\/\//i.test(src) && !src.startsWith("data:"))
    .map(src => src.replace(/^\.\//, "").split(/[?#]/, 1)[0]);
}

function precachedFiles(source) {
  const match = source.match(/const FILES\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(match, "service worker must declare its precache FILES list");
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map(item => item[1].replace(/^\.\//, ""));
}

test("every local JavaScript entry loaded by the app is precached for offline use", () => {
  const cached = new Set(precachedFiles(serviceWorker));
  const scripts = localScripts(indexHtml);
  assert.ok(scripts.length > 0, "app should load local JavaScript modules");
  const missing = scripts.filter(src => src.endsWith(".js") && !cached.has(src));
  assert.deepEqual(missing, [], "missing offline JavaScript modules: " + missing.join(", "));
});

test("Agent Factory browser workbench is included in the offline shell", () => {
  assert.match(indexHtml, /<script[^>]+src=["']agent-factory\/browser-ui\.js["']/i);
  assert.ok(precachedFiles(serviceWorker).includes("agent-factory/browser-ui.js"));
});

test("service worker cache version is bumped for the expanded shell", () => {
  assert.match(serviceWorker, /const CACHE=["']mobile-ai-studio-shell-v21["']/);
});

test("V2.2 Owner Approval Center and floor dashboards are included in the offline shell", () => {
  const cached = new Set(precachedFiles(serviceWorker));
  assert.ok(cached.has("v2.2-owner-floor-control.js"));
  assert.ok(cached.has("v2.2-owner-floor-control.css"));
  assert.match(indexHtml, /v2\.2-owner-floor-control\.js/);
  assert.match(indexHtml, /v2\.2-owner-floor-control\.css/);
  execFileSync(process.execPath, ["--check", path.join(root, "v2.2-owner-floor-control.js")]);
  const source = fs.readFileSync(path.join(root, "v2.2-owner-floor-control.js"), "utf8");
  assert.doesNotMatch(source, /fetch\s*\(|WebSocket\s*\(|EventSource\s*\(/);
});

test("V2.3 Owner operations assets are included and syntax-valid offline", () => {
  const cached = new Set(precachedFiles(serviceWorker));
  assert.ok(cached.has("v2.3-owner-operations.js"));
  assert.ok(cached.has("v2.3-owner-operations.css"));
  assert.match(indexHtml, /v2\.3-owner-operations\.js/);
  assert.match(indexHtml, /v2\.3-owner-operations\.css/);
  execFileSync(process.execPath, ["--check", path.join(root, "v2.3-owner-operations.js")]);
  const source = fs.readFileSync(path.join(root, "v2.3-owner-operations.js"), "utf8");
  assert.doesNotMatch(source, /localStorage\.setItem\s*\(|fetch\s*\(|WebSocket\s*\(|EventSource\s*\(/);
});

test("V2.1 command station assets are included in the offline shell", () => {
  const cached = new Set(precachedFiles(serviceWorker));
  assert.ok(cached.has("v2.1-studio-systems.js"));
  assert.ok(cached.has("v2.1-command-station.css"));
  assert.match(indexHtml, /v2\.1-command-station\.css/);
});
