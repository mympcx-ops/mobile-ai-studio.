"use strict";

// Synthetic pairing lifecycle harness for tests and UI prototyping only.
// No cryptography, challenge secret, credential, network, persistence, or host access exists.
const READ_ONLY_SCOPES = Object.freeze(["READ_STATUS", "READ_HEALTH"]);

function createPairingSimulator(options = {}) {
  const clock = typeof options.clock === "function" ? options.clock : () => Date.now();
  const challengeTtlMs = Number.isInteger(options.challengeTtlMs)
    ? Math.max(1000, Math.min(options.challengeTtlMs, 300000))
    : 300000;
  const devices = new Map();
  const challenges = new Map();
  let pairingWindow = null;
  let challengeSequence = 0;

  function result(ok, state, code, extra = {}) {
    return { ok, state, code, simulation: true, ...extra };
  }

  function openPairingWindow({ ownerApproved } = {}) {
    if (ownerApproved !== true) return result(false, "CLOSED", "OWNER_APPROVAL_REQUIRED");
    pairingWindow = { openedAt: clock(), closesAt: clock() + challengeTtlMs };
    return result(true, "PAIRING_WINDOW_OPEN", "SIMULATED_WINDOW_OPEN", {
      closesAt: pairingWindow.closesAt
    });
  }

  function closePairingWindow() {
    pairingWindow = null;
    return result(true, "CLOSED", "SIMULATED_WINDOW_CLOSED");
  }

  function issueChallenge({ deviceId, publicKeyFingerprint, requestedScopes } = {}) {
    const now = clock();
    if (!pairingWindow || pairingWindow.closesAt <= now) {
      pairingWindow = null;
      return result(false, "CLOSED", "PAIRING_WINDOW_CLOSED");
    }
    if (typeof deviceId !== "string" || !/^[A-Za-z0-9._:-]{8,128}$/.test(deviceId)) {
      return result(false, "CLOSED", "INVALID_DEVICE_ID");
    }
    if (typeof publicKeyFingerprint !== "string" || !/^[A-Fa-f0-9:]{32,128}$/.test(publicKeyFingerprint)) {
      return result(false, "CLOSED", "INVALID_PUBLIC_KEY_FINGERPRINT");
    }
    if (!Array.isArray(requestedScopes) || requestedScopes.length === 0 ||
        requestedScopes.some(scope => !READ_ONLY_SCOPES.includes(scope)) ||
        new Set(requestedScopes).size !== requestedScopes.length) {
      return result(false, "CLOSED", "SCOPE_NOT_ALLOWED");
    }
    const challengeId = "SIM-PAIR-" + String(++challengeSequence).padStart(6, "0");
    const challenge = {
      challengeId,
      deviceId,
      publicKeyFingerprint: publicKeyFingerprint.toUpperCase(),
      requestedScopes: [...requestedScopes],
      issuedAt: now,
      expiresAt: Math.min(now + challengeTtlMs, pairingWindow.closesAt),
      state: "CHALLENGE_ISSUED"
    };
    challenges.set(challengeId, challenge);
    return result(true, challenge.state, "SYNTHETIC_CHALLENGE_ISSUED", {
      challengeId,
      expiresAt: challenge.expiresAt,
      requestedScopes: [...challenge.requestedScopes]
    });
  }

  function submitProof({ challengeId, proofValid } = {}) {
    const challenge = challenges.get(challengeId);
    if (!challenge || challenge.state !== "CHALLENGE_ISSUED") {
      return result(false, "REJECTED", "CHALLENGE_UNKNOWN_OR_CONSUMED");
    }
    if (challenge.expiresAt <= clock()) {
      challenge.state = "EXPIRED";
      return result(false, "EXPIRED", "CHALLENGE_EXPIRED");
    }
    // proofValid is a synthetic test input, never a cryptographic verification.
    challenge.state = "CONSUMED";
    if (proofValid !== true) return result(false, "REJECTED", "SYNTHETIC_PROOF_REJECTED");
    devices.set(challenge.deviceId, {
      deviceId: challenge.deviceId,
      publicKeyFingerprint: challenge.publicKeyFingerprint,
      scopes: [...challenge.requestedScopes],
      state: "OWNER_REVIEW_PENDING"
    });
    return result(true, "OWNER_REVIEW_PENDING", "OWNER_APPROVAL_REQUIRED", {
      deviceId: challenge.deviceId
    });
  }

  function approveEnrollment({ deviceId, ownerApproved } = {}) {
    const device = devices.get(deviceId);
    if (!device || device.state !== "OWNER_REVIEW_PENDING") {
      return result(false, "REJECTED", "ENROLLMENT_NOT_PENDING");
    }
    if (ownerApproved !== true) {
      device.state = "REJECTED";
      return result(false, device.state, "OWNER_REJECTED");
    }
    device.state = "ACTIVE_READ_ONLY";
    return result(true, device.state, "SYNTHETIC_ENROLLMENT_APPROVED", {
      deviceId,
      scopes: [...device.scopes]
    });
  }

  function revokeDevice({ deviceId, ownerApproved } = {}) {
    const device = devices.get(deviceId);
    if (!device || device.state !== "ACTIVE_READ_ONLY") {
      return result(false, "REJECTED", "ACTIVE_DEVICE_NOT_FOUND");
    }
    if (ownerApproved !== true) return result(false, device.state, "OWNER_APPROVAL_REQUIRED");
    device.state = "REVOKED";
    device.scopes = [];
    return result(true, device.state, "SYNTHETIC_DEVICE_REVOKED", { deviceId });
  }

  function authorizeHealthRead({ deviceId, scope = "READ_STATUS" } = {}) {
    const device = devices.get(deviceId);
    if (!device || device.state !== "ACTIVE_READ_ONLY") {
      return result(false, "DENIED", "DEVICE_NOT_ACTIVE");
    }
    if (!READ_ONLY_SCOPES.includes(scope) || !device.scopes.includes(scope)) {
      return result(false, "DENIED", "INSUFFICIENT_SCOPE");
    }
    return result(true, "AUTHORIZED_READ_ONLY", "SYNTHETIC_SCOPE_GRANTED", { scope });
  }

  function classifyConnection({ transportConnected, snapshot, nowMs = clock() } = {}) {
    if (transportConnected !== true) return { state: "DISCONNECTED", source: "SIMULATOR_ONLY" };
    if (!snapshot || !Number.isFinite(snapshot.observedAt) ||
        !Number.isFinite(snapshot.staleAfterMs) || snapshot.staleAfterMs < 0) {
      return { state: "DEGRADED", source: "SIMULATOR_ONLY", code: "INVALID_OR_MISSING_SNAPSHOT" };
    }
    const ageMs = Math.max(0, nowMs - snapshot.observedAt);
    if (ageMs > snapshot.staleAfterMs) {
      return { state: "STALE", source: "SIMULATOR_ONLY", ageMs };
    }
    return { state: "CONNECTED_READ_ONLY", source: "SIMULATOR_ONLY", ageMs };
  }

  function getDevice(deviceId) {
    const device = devices.get(deviceId);
    return device ? { ...device, scopes: [...device.scopes] } : null;
  }

  return Object.freeze({
    openPairingWindow,
    closePairingWindow,
    issueChallenge,
    submitProof,
    approveEnrollment,
    revokeDevice,
    authorizeHealthRead,
    classifyConnection,
    getDevice,
    getDiagnostics: () => ({
      mode: "SIMULATOR_ONLY",
      networkAccess: false,
      cryptography: false,
      credentialsIssued: false,
      persistence: false,
      pcHostAccess: false,
      quinnAccess: false,
      ollamaAccess: false,
      agentDispatch: false,
      execution: false,
      deviceCount: devices.size,
      challengeCount: challenges.size
    })
  });
}

module.exports = { READ_ONLY_SCOPES, createPairingSimulator };
