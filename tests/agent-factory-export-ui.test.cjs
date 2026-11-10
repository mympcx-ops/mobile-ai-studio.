"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "agent-factory", "browser-ui.js"),
  "utf8"
);

test("Agent Factory exposes a selected-package JSON download control", () => {
  assert.match(source, /id="afDownload"/);
  assert.match(source, /Download verified agent package/);
});

test("offline export recomputes package integrity before creating a file", () => {
  const integrityCheck = source.indexOf("if(await fingerprint(body)!==integritySha256)");
  const blobCreation = source.indexOf("new Blob([JSON.stringify(envelope,null,2)]");
  assert.notEqual(integrityCheck, -1);
  assert.notEqual(blobCreation, -1);
  assert.ok(integrityCheck < blobCreation, "integrity must be checked before the export Blob is created");
});

test("export envelope explicitly forbids automatic install and execution", () => {
  assert.match(source, /mode:"OFFLINE_FILE_EXPORT"/);
  assert.match(source, /destination:"MANUAL_PC_IMPORT_REQUIRED"/);
  assert.match(source, /automaticInstall:false/);
  assert.match(source, /executionAuthorized:false/);
});

test("export includes the selected package and only its matching review records", () => {
  assert.match(source, /package:p/);
  assert.match(source, /reviews:state\.reviews\.filter\(r=>r\.packageId===p\.packageId\)/);
});
