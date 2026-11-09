"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  NonceLedger,
  validateEnvelopeShape,
  validateRequest
} = require("../bridge/contract.cjs");

const NOW = 1_800_000_000_000;
function envelope(overrides = {}) {
  return {
    protocol: "mobile-ai-studio-bridge/1",
    requestId: "request-00000001",
    deviceId: "device-00000001",
    timestamp: NOW,
    nonce: "nonce_0123456789abcdef",
    action: "READ_STATUS",
    args: {},
    ...overrides
  };
}
const principal = {
  authenticated: true,
  deviceId: "device-00000001",
  scopes: ["READ_STATUS"]
};

test("accepts a valid read-only status envelope", () => {
  assert.equal(validateEnvelopeShape(envelope(), NOW).ok, true);
});
test("rejects unsupported protocol versions", () => {
  assert.equal(validateEnvelopeShape(envelope({ protocol: "v99" }), NOW).code, "UNSUPPORTED_PROTOCOL");
});
test("rejects expired and future-skewed timestamps", () => {
  assert.equal(validateEnvelopeShape(envelope({ timestamp: NOW - 60001 }), NOW).code, "STALE_TIMESTAMP");
  assert.equal(validateEnvelopeShape(envelope({ timestamp: NOW + 60001 }), NOW).code, "STALE_TIMESTAMP");
});
test("rejects malformed nonce", () => {
  assert.equal(validateEnvelopeShape(envelope({ nonce: "short" }), NOW).code, "INVALID_NONCE");
});
test("rejects unknown and arbitrary execution actions", () => {
  assert.equal(validateEnvelopeShape(envelope({ action: "RUN_SHELL" }), NOW).code, "ACTION_NOT_ALLOWLISTED");
  assert.equal(validateEnvelopeShape(envelope({ action: "EXECUTE_APPROVED" }), NOW).code, "ACTION_NOT_ALLOWLISTED");
});
test("rejects generic shell, command, and path fields", () => {
  for (const field of ["shell", "command", "path"]) {
    assert.equal(validateEnvelopeShape(envelope({ [field]: "whoami" }), NOW).code, "FORBIDDEN_GENERIC_EXECUTION_FIELD");
  }
});
test("rejects unexpected and invalid action-specific arguments", () => {
  assert.equal(validateEnvelopeShape(envelope({ args: { shell: "whoami" } }), NOW).code, "INVALID_ARGUMENTS");
  assert.equal(validateEnvelopeShape(envelope({ action: "READ_PROJECT", args: {} }), NOW).code, "INVALID_ARGUMENTS");
  assert.equal(validateEnvelopeShape(envelope({ action: "READ_PROJECT", args: { projectId: "project-123", extra: true } }), NOW).code, "INVALID_ARGUMENTS");
  assert.equal(validateEnvelopeShape(envelope({ action: "PROPOSE_ACTION", args: { title: "Change", summary: "Test", risk: "critical", rollbackPlan: "Undo" } }), NOW).code, "INVALID_ARGUMENTS");
});
test("rejects non-object arguments and oversized payloads", () => {
  assert.equal(validateEnvelopeShape(envelope({ args: [] }), NOW).code, "INVALID_ARGUMENTS");
  assert.equal(validateEnvelopeShape(envelope({ args: { data: "x".repeat(17000) } }), NOW).code, "ARGUMENTS_TOO_LARGE");
});
test("rejects unauthenticated callers", () => {
  assert.equal(validateRequest(envelope(), { ...principal, authenticated: false }, new NonceLedger(), NOW).code, "UNAUTHENTICATED_DEVICE");
});
test("rejects device identity substitution", () => {
  assert.equal(validateRequest(envelope(), { ...principal, deviceId: "device-00000002" }, new NonceLedger(), NOW).code, "DEVICE_IDENTITY_MISMATCH");
});
test("rejects missing least-privilege scope", () => {
  assert.equal(validateRequest(envelope(), { ...principal, scopes: ["READ_PROJECT"] }, new NonceLedger(), NOW).code, "INSUFFICIENT_SCOPE");
});
test("accepts one authenticated request and rejects its replay", () => {
  const ledger = new NonceLedger();
  assert.equal(validateRequest(envelope(), principal, ledger, NOW).ok, true);
  assert.equal(validateRequest(envelope(), principal, ledger, NOW).code, "REPLAY_OR_NONCE_CAPACITY");
});
test("nonce ledger expires entries after its TTL", () => {
  const ledger = new NonceLedger({ ttlMs: 1000 });
  assert.equal(ledger.consume("device-00000001", "nonce_0123456789abcdef", NOW), true);
  assert.equal(ledger.consume("device-00000001", "nonce_0123456789abcdef", NOW + 1001), true);
});
test("does not allow a caller to claim its own scopes in the envelope", () => {
  const forged = envelope({ action: "ADMIN_PAIRING", scopes: ["ADMIN_PAIRING"], args: { operation: "list_devices" } });
  assert.equal(validateRequest(forged, principal, new NonceLedger(), NOW).code, "INSUFFICIENT_SCOPE");
  // Authorization comes only from the trusted principal; envelope scopes are ignored.
});
test("fails closed when nonce ledger is missing", () => {
  assert.equal(validateRequest(envelope(), principal, null, NOW).code, "REPLAY_OR_NONCE_CAPACITY");
});
