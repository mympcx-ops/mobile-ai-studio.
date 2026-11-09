"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

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
  assert.match(serviceWorker, /const CACHE=["']mobile-ai-studio-shell-v13["']/);
});
