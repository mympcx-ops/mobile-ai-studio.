"use strict";

// Server-side protocol contract reference only.
// This module is not a network server, authenticator, or production security boundary.
// A real server MUST authenticate TLS/device identity before calling validateRequest.

const ACTION_SCOPES = Object.freeze({
  READ_STATUS: "READ_STATUS",
  READ_PROJECT: "READ_PROJECT",
  PROPOSE_TASK: "PROPOSE_TASK",
  PROPOSE_ACTION: "PROPOSE_ACTION",
  ADMIN_PAIRING: "ADMIN_PAIRING"
});
const MAX_ARGUMENT_BYTES = 16 * 1024;
const MAX_CLOCK_SKEW_MS = 60 * 1000;
const NONCE_TTL_MS = 5 * 60 * 1000;
const ID_RE = /^[A-Za-z0-9._:-]{8,128}$/;
const NONCE_RE = /^[A-Za-z0-9_-]{16,128}$/;

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function validateEnvelopeShape(envelope, nowMs = Date.now()) {
  if (!isPlainObject(envelope)) return { ok: false, code: "INVALID_ENVELOPE" };
  if (envelope.protocol !== "mobile-ai-studio-bridge/1") return { ok: false, code: "UNSUPPORTED_PROTOCOL" };
  if (typeof envelope.requestId !== "string" || !ID_RE.test(envelope.requestId)) return { ok: false, code: "INVALID_REQUEST_ID" };
  if (typeof envelope.deviceId !== "string" || !ID_RE.test(envelope.deviceId)) return { ok: false, code: "INVALID_DEVICE_ID" };
  if (typeof envelope.timestamp !== "number" || !Number.isFinite(envelope.timestamp)) return { ok: false, code: "INVALID_TIMESTAMP" };
  if (Math.abs(nowMs - envelope.timestamp) > MAX_CLOCK_SKEW_MS) return { ok: false, code: "STALE_TIMESTAMP" };
  if (typeof envelope.nonce !== "string" || !NONCE_RE.test(envelope.nonce)) return { ok: false, code: "INVALID_NONCE" };
  if (typeof envelope.action !== "string" || !Object.hasOwn(ACTION_SCOPES, envelope.action)) return { ok: false, code: "ACTION_NOT_ALLOWLISTED" };
  if (!isPlainObject(envelope.args)) return { ok: false, code: "INVALID_ARGUMENTS" };
  let bytes;
  try { bytes = Buffer.byteLength(JSON.stringify(envelope.args), "utf8"); }
  catch { return { ok: false, code: "ARGUMENTS_NOT_SERIALIZABLE" }; }
  if (bytes > MAX_ARGUMENT_BYTES) return { ok: false, code: "ARGUMENTS_TOO_LARGE" };
  if (Object.hasOwn(envelope, "shell") || Object.hasOwn(envelope, "command") || Object.hasOwn(envelope, "path")) {
    return { ok: false, code: "FORBIDDEN_GENERIC_EXECUTION_FIELD" };
  }
  return { ok: true, requiredScope: ACTION_SCOPES[envelope.action] };
}

class NonceLedger {
  constructor({ ttlMs = NONCE_TTL_MS, maxEntries = 10000 } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.entries = new Map();
  }
  consume(deviceId, nonce, nowMs = Date.now()) {
    for (const [key, expiry] of this.entries) if (expiry <= nowMs) this.entries.delete(key);
    const key = deviceId + ":" + nonce;
    if (this.entries.has(key)) return false;
    if (this.entries.size >= this.maxEntries) return false;
    this.entries.set(key, nowMs + this.ttlMs);
    return true;
  }
}

function validateRequest(envelope, principal, nonceLedger, nowMs = Date.now()) {
  const shape = validateEnvelopeShape(envelope, nowMs);
  if (!shape.ok) return shape;
  // principal must come from verified server middleware, never from request JSON.
  if (!isPlainObject(principal) || principal.authenticated !== true) return { ok: false, code: "UNAUTHENTICATED_DEVICE" };
  if (principal.deviceId !== envelope.deviceId) return { ok: false, code: "DEVICE_IDENTITY_MISMATCH" };
  if (!Array.isArray(principal.scopes) || !principal.scopes.includes(shape.requiredScope)) return { ok: false, code: "INSUFFICIENT_SCOPE" };
  if (!(nonceLedger instanceof NonceLedger) || !nonceLedger.consume(envelope.deviceId, envelope.nonce, nowMs)) {
    return { ok: false, code: "REPLAY_OR_NONCE_CAPACITY" };
  }
  // EXECUTE_APPROVED is deliberately absent from the allowlist.
  return { ok: true, requestId: envelope.requestId, action: envelope.action };
}

module.exports = {
  ACTION_SCOPES,
  MAX_ARGUMENT_BYTES,
  MAX_CLOCK_SKEW_MS,
  NONCE_TTL_MS,
  NonceLedger,
  validateEnvelopeShape,
  validateRequest
};
