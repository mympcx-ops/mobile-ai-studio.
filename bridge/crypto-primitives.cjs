"use strict";

// V2.0 cryptographic pairing primitives.
// This module is a testable protocol building block, NOT a production pairing service.
// It does not persist keys, issue credentials, authenticate a host, or prevent replay.

const crypto = require("node:crypto");

const PROTOCOL = "mobile-ai-studio-pairing/1";
const READ_ONLY_SCOPES = Object.freeze(["READ_STATUS", "READ_HEALTH"]);
const MAX_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const CLOCK_SKEW_MS = 30 * 1000;
const CHALLENGE_FIELDS = Object.freeze([
  "protocol", "challengeId", "deviceId", "hostId", "nonce",
  "issuedAt", "expiresAt", "requestedScopes"
]);

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function canonicalChallenge(challenge) {
  if (!isPlainObject(challenge)) throw new TypeError("Challenge must be a plain object.");
  const keys = Object.keys(challenge).sort();
  const expected = [...CHALLENGE_FIELDS].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new TypeError("Challenge fields do not match the protocol contract.");
  }
  return JSON.stringify({
    protocol: challenge.protocol,
    challengeId: challenge.challengeId,
    deviceId: challenge.deviceId,
    hostId: challenge.hostId,
    nonce: challenge.nonce,
    issuedAt: challenge.issuedAt,
    expiresAt: challenge.expiresAt,
    requestedScopes: [...challenge.requestedScopes]
  });
}

function validateChallenge(challenge, nowMs = Date.now()) {
  if (!isPlainObject(challenge)) return { ok: false, code: "INVALID_CHALLENGE" };
  try { canonicalChallenge(challenge); } catch { return { ok: false, code: "INVALID_CHALLENGE_FIELDS" }; }
  if (challenge.protocol !== PROTOCOL) return { ok: false, code: "UNSUPPORTED_PROTOCOL" };
  if (typeof challenge.challengeId !== "string" || !/^[0-9a-f-]{36}$/i.test(challenge.challengeId)) {
    return { ok: false, code: "INVALID_CHALLENGE_ID" };
  }
  if (typeof challenge.deviceId !== "string" || !/^[A-Za-z0-9._:-]{8,128}$/.test(challenge.deviceId)) {
    return { ok: false, code: "INVALID_DEVICE_ID" };
  }
  if (typeof challenge.hostId !== "string" || !/^[A-Za-z0-9._:-]{8,128}$/.test(challenge.hostId)) {
    return { ok: false, code: "INVALID_HOST_ID" };
  }
  if (typeof challenge.nonce !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(challenge.nonce)) {
    return { ok: false, code: "INVALID_NONCE" };
  }
  if (!Number.isSafeInteger(challenge.issuedAt) || !Number.isSafeInteger(challenge.expiresAt)) {
    return { ok: false, code: "INVALID_CHALLENGE_TIME" };
  }
  const ttl = challenge.expiresAt - challenge.issuedAt;
  if (ttl < 1000 || ttl > MAX_CHALLENGE_TTL_MS) return { ok: false, code: "INVALID_CHALLENGE_TTL" };
  if (challenge.issuedAt > nowMs + CLOCK_SKEW_MS) return { ok: false, code: "CHALLENGE_FROM_FUTURE" };
  if (challenge.expiresAt <= nowMs) return { ok: false, code: "CHALLENGE_EXPIRED" };
  if (!Array.isArray(challenge.requestedScopes) || challenge.requestedScopes.length === 0 ||
      challenge.requestedScopes.some(scope => !READ_ONLY_SCOPES.includes(scope)) ||
      new Set(challenge.requestedScopes).size !== challenge.requestedScopes.length) {
    return { ok: false, code: "SCOPE_NOT_ALLOWED" };
  }
  return { ok: true, code: "CHALLENGE_VALID" };
}

function createDeviceIdentity() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const fingerprintSha256 = crypto.createHash("sha256")
    .update(publicKey.export({ type: "spki", format: "der" }))
    .digest("hex");
  // The private KeyObject is returned in memory only. Callers must use platform-protected
  // key storage before any real phone pairing; do not serialize it to localStorage.
  return Object.freeze({ publicKey, privateKey, publicKeyPem, fingerprintSha256 });
}

function createPairingChallenge({
  deviceId, hostId, requestedScopes = ["READ_STATUS", "READ_HEALTH"],
  nowMs = Date.now(), ttlMs = 120000
} = {}) {
  const challenge = {
    protocol: PROTOCOL,
    challengeId: crypto.randomUUID(),
    deviceId,
    hostId,
    nonce: crypto.randomBytes(32).toString("base64url"),
    issuedAt: nowMs,
    expiresAt: nowMs + ttlMs,
    requestedScopes: [...requestedScopes]
  };
  const validation = validateChallenge(challenge, nowMs);
  if (!validation.ok) {
    const error = new TypeError(validation.code);
    error.code = validation.code;
    throw error;
  }
  return Object.freeze(challenge);
}

function signPairingChallenge(challenge, privateKey) {
  const validation = validateChallenge(challenge, challenge?.issuedAt);
  if (!validation.ok) {
    const error = new TypeError(validation.code);
    error.code = validation.code;
    throw error;
  }
  if (!privateKey || privateKey.type !== "private" || privateKey.asymmetricKeyType !== "ed25519") {
    throw new TypeError("An Ed25519 private KeyObject is required.");
  }
  return crypto.sign(null, Buffer.from(canonicalChallenge(challenge), "utf8"), privateKey).toString("base64url");
}

function verifyPairingProof({ challenge, signature, publicKeyPem, nowMs = Date.now() } = {}) {
  const validation = validateChallenge(challenge, nowMs);
  if (!validation.ok) return validation;
  if (typeof signature !== "string" || !/^[A-Za-z0-9_-]{80,100}$/.test(signature)) {
    return { ok: false, code: "INVALID_SIGNATURE_ENCODING" };
  }
  if (typeof publicKeyPem !== "string" || publicKeyPem.length > 4096) {
    return { ok: false, code: "INVALID_PUBLIC_KEY" };
  }
  try {
    const publicKey = crypto.createPublicKey(publicKeyPem);
    if (publicKey.asymmetricKeyType !== "ed25519") return { ok: false, code: "UNSUPPORTED_PUBLIC_KEY_TYPE" };
    const valid = crypto.verify(
      null,
      Buffer.from(canonicalChallenge(challenge), "utf8"),
      publicKey,
      Buffer.from(signature, "base64url")
    );
    if (!valid) return { ok: false, code: "PAIRING_PROOF_INVALID" };
    const fingerprintSha256 = crypto.createHash("sha256")
      .update(publicKey.export({ type: "spki", format: "der" }))
      .digest("hex");
    return { ok: true, code: "PAIRING_PROOF_VALID", deviceId: challenge.deviceId, hostId: challenge.hostId, fingerprintSha256 };
  } catch {
    return { ok: false, code: "PUBLIC_KEY_OR_SIGNATURE_INVALID" };
  }
}

module.exports = {
  PROTOCOL,
  READ_ONLY_SCOPES,
  MAX_CHALLENGE_TTL_MS,
  createDeviceIdentity,
  createPairingChallenge,
  validateChallenge,
  signPairingChallenge,
  verifyPairingProof
};
