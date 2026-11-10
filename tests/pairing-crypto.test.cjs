"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createDeviceIdentity,
  createPairingChallenge,
  validateChallenge,
  signPairingChallenge,
  verifyPairingProof
} = require("../bridge/crypto-primitives.cjs");

const NOW = 1900000000000;
const DEVICE = "android-owner-device-01";
const HOST = "studio-pc-host-0001";

test("Ed25519 device identity exposes a stable public-key fingerprint", () => {
  const identity = createDeviceIdentity();
  assert.equal(identity.publicKey.asymmetricKeyType, "ed25519");
  assert.equal(identity.privateKey.asymmetricKeyType, "ed25519");
  assert.match(identity.fingerprintSha256, /^[a-f0-9]{64}$/);
  assert.match(identity.publicKeyPem, /BEGIN PUBLIC KEY/);
});

test("a valid read-only pairing proof verifies against the matching public key", () => {
  const identity = createDeviceIdentity();
  const challenge = createPairingChallenge({ deviceId: DEVICE, hostId: HOST, nowMs: NOW });
  const signature = signPairingChallenge(challenge, identity.privateKey);
  const result = verifyPairingProof({
    challenge, signature, publicKeyPem: identity.publicKeyPem, nowMs: NOW + 1000
  });
  assert.equal(result.ok, true);
  assert.equal(result.code, "PAIRING_PROOF_VALID");
  assert.equal(result.deviceId, DEVICE);
  assert.equal(result.hostId, HOST);
  assert.equal(result.fingerprintSha256, identity.fingerprintSha256);
});

test("tampered challenge content invalidates the signature", () => {
  const identity = createDeviceIdentity();
  const challenge = createPairingChallenge({ deviceId: DEVICE, hostId: HOST, nowMs: NOW });
  const signature = signPairingChallenge(challenge, identity.privateKey);
  const tampered = { ...challenge, hostId: "different-studio-host-02" };
  const result = verifyPairingProof({
    challenge: tampered, signature, publicKeyPem: identity.publicKeyPem, nowMs: NOW + 1000
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "PAIRING_PROOF_INVALID");
});

test("proof from a different device key is rejected", () => {
  const signer = createDeviceIdentity();
  const other = createDeviceIdentity();
  const challenge = createPairingChallenge({ deviceId: DEVICE, hostId: HOST, nowMs: NOW });
  const signature = signPairingChallenge(challenge, signer.privateKey);
  const result = verifyPairingProof({
    challenge, signature, publicKeyPem: other.publicKeyPem, nowMs: NOW + 1000
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "PAIRING_PROOF_INVALID");
});

test("expired, future-dated and overlong challenges fail closed", () => {
  const expired = createPairingChallenge({ deviceId: DEVICE, hostId: HOST, nowMs: NOW });
  assert.equal(validateChallenge(expired, NOW + 120001).code, "CHALLENGE_EXPIRED");
  assert.equal(validateChallenge(expired, NOW - 31000).code, "CHALLENGE_FROM_FUTURE");
  assert.throws(() => createPairingChallenge({
    deviceId: DEVICE, hostId: HOST, nowMs: NOW, ttlMs: 300001
  }), /INVALID_CHALLENGE_TTL/);
});

test("unsafe scopes, duplicate scopes and malformed challenge fields are rejected", () => {
  assert.throws(() => createPairingChallenge({
    deviceId: DEVICE, hostId: HOST, requestedScopes: ["READ_STATUS", "EXECUTE"], nowMs: NOW
  }), /SCOPE_NOT_ALLOWED/);
  assert.throws(() => createPairingChallenge({
    deviceId: DEVICE, hostId: HOST, requestedScopes: ["READ_STATUS", "READ_STATUS"], nowMs: NOW
  }), /SCOPE_NOT_ALLOWED/);
  const challenge = createPairingChallenge({ deviceId: DEVICE, hostId: HOST, nowMs: NOW });
  assert.equal(validateChallenge({ ...challenge, unexpected: true }, NOW).code, "INVALID_CHALLENGE_FIELDS");
});

test("non-Ed25519 keys and malformed proof encodings are rejected", () => {
  const identity = createDeviceIdentity();
  const challenge = createPairingChallenge({ deviceId: DEVICE, hostId: HOST, nowMs: NOW });
  assert.throws(() => signPairingChallenge(challenge, identity.publicKey), /private KeyObject/);
  assert.equal(verifyPairingProof({
    challenge, signature: "not-a-signature", publicKeyPem: identity.publicKeyPem, nowMs: NOW
  }).code, "INVALID_SIGNATURE_ENCODING");
});

test("the primitives do not expose token issuance, persistence or execution actions", () => {
  const api = require("../bridge/crypto-primitives.cjs");
  assert.equal(Object.hasOwn(api, "issueCredential"), false);
  assert.equal(Object.hasOwn(api, "persistIdentity"), false);
  assert.equal(Object.hasOwn(api, "execute"), false);
});
