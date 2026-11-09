"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createPairingSimulator } = require("../bridge/pairing-simulator.cjs");

const DEVICE = "android-phone-0001";
const FINGERPRINT = "A1B2C3D4E5F60718293A4B5C6D7E8F9012345678";

function setup() {
  let now = 100000;
  const sim = createPairingSimulator({ clock: () => now, challengeTtlMs: 5000 });
  return { sim, advance: ms => { now += ms; }, now: () => now };
}

function enroll(sim, scopes = ["READ_STATUS", "READ_HEALTH"]) {
  assert.equal(sim.openPairingWindow({ ownerApproved: true }).ok, true);
  const issued = sim.issueChallenge({
    deviceId: DEVICE,
    publicKeyFingerprint: FINGERPRINT,
    requestedScopes: scopes
  });
  assert.equal(issued.ok, true);
  assert.equal(sim.submitProof({ challengeId: issued.challengeId, proofValid: true }).state, "OWNER_REVIEW_PENDING");
  return sim.approveEnrollment({ deviceId: DEVICE, ownerApproved: true });
}

test("pairing window cannot open without explicit Owner approval", () => {
  const { sim } = setup();
  assert.equal(sim.openPairingWindow({ ownerApproved: false }).code, "OWNER_APPROVAL_REQUIRED");
  assert.equal(sim.issueChallenge({}).code, "PAIRING_WINDOW_CLOSED");
});

test("Owner can open and close a synthetic pairing window", () => {
  const { sim } = setup();
  assert.equal(sim.openPairingWindow({ ownerApproved: true }).state, "PAIRING_WINDOW_OPEN");
  assert.equal(sim.closePairingWindow().state, "CLOSED");
});

test("challenge cannot be issued while pairing window is closed", () => {
  const { sim } = setup();
  assert.equal(sim.issueChallenge({}).code, "PAIRING_WINDOW_CLOSED");
});

test("challenge rejects malformed device identity", () => {
  const { sim } = setup();
  sim.openPairingWindow({ ownerApproved: true });
  assert.equal(sim.issueChallenge({ deviceId: "x", publicKeyFingerprint: FINGERPRINT, requestedScopes: ["READ_STATUS"] }).code, "INVALID_DEVICE_ID");
});

test("challenge rejects malformed public-key fingerprint", () => {
  const { sim } = setup();
  sim.openPairingWindow({ ownerApproved: true });
  assert.equal(sim.issueChallenge({ deviceId: DEVICE, publicKeyFingerprint: "not-a-fingerprint", requestedScopes: ["READ_STATUS"] }).code, "INVALID_PUBLIC_KEY_FINGERPRINT");
});

test("challenge rejects empty, duplicate, or privileged scopes", () => {
  const { sim } = setup();
  sim.openPairingWindow({ ownerApproved: true });
  for (const requestedScopes of [[], ["READ_STATUS", "READ_STATUS"], ["EXECUTE"], ["DISPATCH_AGENT"]]) {
    assert.equal(sim.issueChallenge({ deviceId: DEVICE, publicKeyFingerprint: FINGERPRINT, requestedScopes }).code, "SCOPE_NOT_ALLOWED");
  }
});

test("challenge issuance returns a synthetic identifier, not a credential", () => {
  const { sim } = setup();
  sim.openPairingWindow({ ownerApproved: true });
  const issued = sim.issueChallenge({ deviceId: DEVICE, publicKeyFingerprint: FINGERPRINT, requestedScopes: ["READ_STATUS"] });
  assert.match(issued.challengeId, /^SIM-PAIR-/);
  assert.equal(Object.hasOwn(issued, "credential"), false);
  assert.equal(Object.hasOwn(issued, "challengeSecret"), false);
});

test("challenge expires and cannot be used after expiry", () => {
  const { sim, advance } = setup();
  sim.openPairingWindow({ ownerApproved: true });
  const issued = sim.issueChallenge({ deviceId: DEVICE, publicKeyFingerprint: FINGERPRINT, requestedScopes: ["READ_STATUS"] });
  advance(5001);
  assert.equal(sim.submitProof({ challengeId: issued.challengeId, proofValid: true }).code, "CHALLENGE_EXPIRED");
});

test("failed synthetic proof is rejected and consumed", () => {
  const { sim } = setup();
  sim.openPairingWindow({ ownerApproved: true });
  const issued = sim.issueChallenge({ deviceId: DEVICE, publicKeyFingerprint: FINGERPRINT, requestedScopes: ["READ_STATUS"] });
  assert.equal(sim.submitProof({ challengeId: issued.challengeId, proofValid: false }).code, "SYNTHETIC_PROOF_REJECTED");
  assert.equal(sim.submitProof({ challengeId: issued.challengeId, proofValid: true }).code, "CHALLENGE_UNKNOWN_OR_CONSUMED");
});

test("valid synthetic proof requires a separate Owner enrollment decision", () => {
  const { sim } = setup();
  sim.openPairingWindow({ ownerApproved: true });
  const issued = sim.issueChallenge({ deviceId: DEVICE, publicKeyFingerprint: FINGERPRINT, requestedScopes: ["READ_STATUS"] });
  assert.equal(sim.submitProof({ challengeId: issued.challengeId, proofValid: true }).state, "OWNER_REVIEW_PENDING");
  assert.equal(sim.getDevice(DEVICE).state, "OWNER_REVIEW_PENDING");
  assert.equal(sim.authorizeHealthRead({ deviceId: DEVICE }).code, "DEVICE_NOT_ACTIVE");
});

test("Owner rejection prevents activation", () => {
  const { sim } = setup();
  sim.openPairingWindow({ ownerApproved: true });
  const issued = sim.issueChallenge({ deviceId: DEVICE, publicKeyFingerprint: FINGERPRINT, requestedScopes: ["READ_STATUS"] });
  sim.submitProof({ challengeId: issued.challengeId, proofValid: true });
  assert.equal(sim.approveEnrollment({ deviceId: DEVICE, ownerApproved: false }).state, "REJECTED");
  assert.equal(sim.authorizeHealthRead({ deviceId: DEVICE }).ok, false);
});

test("Owner approval activates only requested read-only scopes", () => {
  const { sim } = setup();
  assert.equal(enroll(sim).state, "ACTIVE_READ_ONLY");
  assert.equal(sim.authorizeHealthRead({ deviceId: DEVICE, scope: "READ_STATUS" }).ok, true);
  assert.equal(sim.authorizeHealthRead({ deviceId: DEVICE, scope: "READ_HEALTH" }).ok, true);
  assert.equal(sim.authorizeHealthRead({ deviceId: DEVICE, scope: "EXECUTE" }).code, "INSUFFICIENT_SCOPE");
});

test("scope not requested at pairing cannot be used", () => {
  const { sim } = setup();
  enroll(sim, ["READ_STATUS"]);
  assert.equal(sim.authorizeHealthRead({ deviceId: DEVICE, scope: "READ_HEALTH" }).code, "INSUFFICIENT_SCOPE");
});

test("revocation requires Owner approval", () => {
  const { sim } = setup();
  enroll(sim);
  assert.equal(sim.revokeDevice({ deviceId: DEVICE, ownerApproved: false }).code, "OWNER_APPROVAL_REQUIRED");
  assert.equal(sim.authorizeHealthRead({ deviceId: DEVICE }).ok, true);
});

test("revoked device loses all read access immediately", () => {
  const { sim } = setup();
  enroll(sim);
  assert.equal(sim.revokeDevice({ deviceId: DEVICE, ownerApproved: true }).state, "REVOKED");
  assert.equal(sim.authorizeHealthRead({ deviceId: DEVICE }).code, "DEVICE_NOT_ACTIVE");
  assert.deepEqual(sim.getDevice(DEVICE).scopes, []);
});

test("unknown device cannot be revoked or authorized", () => {
  const { sim } = setup();
  assert.equal(sim.revokeDevice({ deviceId: "unknown-device", ownerApproved: true }).code, "ACTIVE_DEVICE_NOT_FOUND");
  assert.equal(sim.authorizeHealthRead({ deviceId: "unknown-device" }).code, "DEVICE_NOT_ACTIVE");
});

test("connection recovery never claims live host data", () => {
  const { sim, now } = setup();
  const state = sim.classifyConnection({
    transportConnected: true,
    snapshot: { observedAt: now(), staleAfterMs: 1000 }
  });
  assert.equal(state.state, "CONNECTED_READ_ONLY");
  assert.equal(state.source, "SIMULATOR_ONLY");
});

test("disconnected transport wins over a cached snapshot", () => {
  const { sim, now } = setup();
  assert.equal(sim.classifyConnection({
    transportConnected: false,
    snapshot: { observedAt: now(), staleAfterMs: 1000 }
  }).state, "DISCONNECTED");
});

test("old health snapshot is marked stale", () => {
  const { sim, now, advance } = setup();
  advance(1001);
  assert.equal(sim.classifyConnection({
    transportConnected: true,
    snapshot: { observedAt: now() - 1001, staleAfterMs: 1000 },
    nowMs: now()
  }).state, "STALE");
});

test("missing or malformed health snapshot is degraded", () => {
  const { sim } = setup();
  assert.equal(sim.classifyConnection({ transportConnected: true }).state, "DEGRADED");
  assert.equal(sim.classifyConnection({ transportConnected: true, snapshot: { observedAt: 1, staleAfterMs: -1 } }).state, "DEGRADED");
});

test("diagnostics prove the harness has no real security or host capabilities", () => {
  const { sim } = setup();
  const d = sim.getDiagnostics();
  assert.equal(d.mode, "SIMULATOR_ONLY");
  assert.equal(d.networkAccess, false);
  assert.equal(d.cryptography, false);
  assert.equal(d.credentialsIssued, false);
  assert.equal(d.persistence, false);
  assert.equal(d.pcHostAccess, false);
  assert.equal(d.quinnAccess, false);
  assert.equal(d.ollamaAccess, false);
  assert.equal(d.agentDispatch, false);
  assert.equal(d.execution, false);
});


test("closing pairing window invalidates every outstanding challenge", () => {
  const { sim } = setup();
  sim.openPairingWindow({ ownerApproved: true });
  const issued = sim.issueChallenge({
    deviceId: DEVICE,
    publicKeyFingerprint: FINGERPRINT,
    requestedScopes: ["READ_STATUS"]
  });
  assert.equal(issued.ok, true);
  sim.closePairingWindow();
  assert.equal(sim.submitProof({ challengeId: issued.challengeId, proofValid: true }).code, "CHALLENGE_UNKNOWN_OR_CONSUMED");
  assert.equal(sim.getDevice(DEVICE), null);
});

test("a device cannot accumulate multiple simultaneously pending challenges", () => {
  const { sim } = setup();
  sim.openPairingWindow({ ownerApproved: true });
  const request = {
    deviceId: DEVICE,
    publicKeyFingerprint: FINGERPRINT,
    requestedScopes: ["READ_STATUS"]
  };
  assert.equal(sim.issueChallenge(request).ok, true);
  assert.equal(sim.issueChallenge(request).code, "DEVICE_CHALLENGE_ALREADY_PENDING");
});

test("an active device cannot silently replace its enrollment with a new pending challenge", () => {
  const { sim } = setup();
  enroll(sim);
  const result = sim.issueChallenge({
    deviceId: DEVICE,
    publicKeyFingerprint: FINGERPRINT,
    requestedScopes: ["READ_STATUS"]
  });
  assert.equal(result.code, "DEVICE_ALREADY_ENROLLED");
  assert.equal(sim.getDevice(DEVICE).state, "ACTIVE_READ_ONLY");
});

test("a revoked device must complete a fresh Owner-gated enrollment before access returns", () => {
  const { sim } = setup();
  enroll(sim);
  sim.revokeDevice({ deviceId: DEVICE, ownerApproved: true });
  assert.equal(sim.authorizeHealthRead({ deviceId: DEVICE }).code, "DEVICE_NOT_ACTIVE");
  const issued = sim.issueChallenge({
    deviceId: DEVICE,
    publicKeyFingerprint: FINGERPRINT,
    requestedScopes: ["READ_STATUS"]
  });
  assert.equal(issued.ok, true);
  assert.equal(sim.submitProof({ challengeId: issued.challengeId, proofValid: true }).state, "OWNER_REVIEW_PENDING");
  assert.equal(sim.authorizeHealthRead({ deviceId: DEVICE }).code, "DEVICE_NOT_ACTIVE");
  assert.equal(sim.approveEnrollment({ deviceId: DEVICE, ownerApproved: true }).state, "ACTIVE_READ_ONLY");
});

test("pending pairing challenge count is bounded", () => {
  const { sim } = setup();
  sim.openPairingWindow({ ownerApproved: true });
  for (let i = 0; i < 100; i += 1) {
    const result = sim.issueChallenge({
      deviceId: "android-device-" + String(i).padStart(4, "0"),
      publicKeyFingerprint: FINGERPRINT,
      requestedScopes: ["READ_STATUS"]
    });
    assert.equal(result.ok, true);
  }
  assert.equal(sim.issueChallenge({
    deviceId: "android-device-overflow",
    publicKeyFingerprint: FINGERPRINT,
    requestedScopes: ["READ_STATUS"]
  }).code, "PAIRING_CAPACITY_REACHED");
});
