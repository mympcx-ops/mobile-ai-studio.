"use strict";

// Read-only convenience CLI. It never modifies the selected file or creates a staging record.
const fs = require("node:fs");
const path = require("node:path");
const { MAX_INPUT_BYTES, validateEnvelope } = require("./validator.cjs");

function report(result) {
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

function main() {
  const supplied = process.argv[2];
  if (!supplied || process.argv.length !== 3) {
    report({ valid: false, status: "REJECTED", code: "USAGE", message: "Usage: node desktop-import/validate-file.cjs <path-to-export.json>" });
    process.exitCode = 2;
    return;
  }
  const target = path.resolve(supplied);
  let descriptor;
  try {
    const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
    descriptor = fs.openSync(target, flags);
    const stat = fs.fstatSync(descriptor);
    if (!stat.isFile()) throw new Error("Selected path is not a regular file.");
    if (stat.size > MAX_INPUT_BYTES) throw new Error("Selected file exceeds the 1 MiB validation limit.");
    const raw = fs.readFileSync(descriptor, "utf8");
    const result = validateEnvelope(raw);
    report(result);
    if (!result.valid) process.exitCode = 1;
  } catch (error) {
    report({ valid: false, status: "REJECTED", code: "FILE_READ_FAILED", message: error.message });
    process.exitCode = 1;
  } finally {
    if (descriptor !== undefined) { try { fs.closeSync(descriptor); } catch {} }
  }
}
main();
