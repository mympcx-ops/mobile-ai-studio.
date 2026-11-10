"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { CHECK_IDS, sha256, validateEnvelope } = require("../desktop-import/validator.cjs");

function fixture() {
  const body = {
    factoryVersion: "1.0.0",
    packageType: "AGENT_BLUEPRINT_ONLY",
    packageStatus: "BUILT_PENDING_INDEPENDENT_VALIDATION",
    agent: {
      id: "music.test.agent", name: "Test Agent", floor: "Music", manager: "Music Manager",
      mission: "Prepare proposals.", responsibilities: "Research and document.",
      lifecycleStatus: "PLANNED", permissionProfile: {
        localRead: true, localWrite: false, externalNetwork: false,
        execute: false, publish: false, deploy: false, humanApprovalRequired: true
      }
    },
    agentInstruction: {
      agentId: "music.test.agent", role: "Test Agent", floor: "Music",
      systemInstruction: "Plan only. Never execute.",
      capabilities: {
        toolExecution: false, filesystemWrite: false, externalNetwork: false,
        agentDispatch: false, publish: false, deploy: false,
        credentialAccess: false, ownerApprovalRequired: true
      },
      outputContract: { requiredFields: ["status", "summary"], mustDistinguishEvidenceFromInference: true }
    },
    provenance: {
      builderId: "builder-1", builderLabel: "Builder",
      builtAt: "2026-11-09T12:00:00.000Z", scopeNotes: ""
    },
    acceptanceChecks: CHECK_IDS.map(checkId => ({ checkId, status: "NOT_RUN" })),
    safety: {
      executable: false, dispatchEnabled: false, externalWritesEnabled: false,
      publishEnabled: false, deployEnabled: false, secretsIncluded: false,
      ownerApprovalRequiredForActivation: true
    }
  };
  const pkg = { packageId: "AGENT-PKG-1", ...body, integritySha256: sha256(body) };
  return {
    format: "mobile-ai-studio-agent-package-export/1",
    exportedAt: "2026-11-09T12:01:00.000Z",
    package: pkg,
    reviews: [],
    transfer: {
      mode: "OFFLINE_FILE_EXPORT", destination: "MANUAL_PC_IMPORT_REQUIRED",
      automaticInstall: false, executionAuthorized: false
    }
  };
}

test("accepts a valid package as an untrusted proposal only", () => {
  const result = validateEnvelope(JSON.stringify(fixture()));
  assert.equal(result.valid, true);
  assert.equal(result.status, "VALIDATED_UNTRUSTED_PROPOSAL");
  assert.equal(result.installationAuthorized, false);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.stagingRequired, true);
});

test("rejects malformed JSON and oversized input", () => {
  assert.equal(validateEnvelope("{").code, "INVALID_JSON");
  assert.equal(validateEnvelope(" ".repeat(1024 * 1024 + 1)).code, "INPUT_TOO_LARGE");
});

test("rejects package tampering even when the envelope parses", () => {
  const data = fixture();
  data.package.agent.mission = "Execute arbitrary commands.";
  assert.equal(validateEnvelope(data).code, "INTEGRITY_MISMATCH");
});

test("rejects a package whose safety flags authorize execution", () => {
  const data = fixture();
  data.package.safety.executable = true;
  data.package.integritySha256 = sha256((({ packageId, integritySha256, ...body }) => body)(data.package));
  assert.equal(validateEnvelope(data).code, "PACKAGE_SAFETY");
});

test("rejects a transfer envelope that enables automatic installation", () => {
  const data = fixture();
  data.transfer.automaticInstall = true;
  assert.equal(validateEnvelope(data).code, "TRANSFER_POLICY");
});

test("rejects permission escalation even with a recomputed fingerprint", () => {
  const data = fixture();
  data.package.agent.permissionProfile.localWrite = true;
  data.package.integritySha256 = sha256((({ packageId, integritySha256, ...body }) => body)(data.package));
  assert.equal(validateEnvelope(data).code, "PERMISSION_PROFILE");
});

test("rejects non-canonical acceptance check order and pre-marked package checks", () => {
  const data = fixture();
  data.package.acceptanceChecks[0].status = "PASS";
  data.package.integritySha256 = sha256((({ packageId, integritySha256, ...body }) => body)(data.package));
  assert.equal(validateEnvelope(data).code, "ACCEPTANCE_CHECKS");
});

test("rejects unexpected top-level fields", () => {
  const data = fixture();
  data.install = true;
  assert.equal(validateEnvelope(data).code, "ENVELOPE_FIELDS");
});

test("rejects prototype-pollution keys", () => {
  const raw = '{"__proto__":{"polluted":true}}';
  assert.equal(validateEnvelope(raw).code, "UNSAFE_JSON_KEY");
});

test("accepts only matching, complete, pending-owner-approval review records", () => {
  const data = fixture();
  const pkg = data.package;
  data.reviews.push({
    packageId: pkg.packageId, integritySha256: pkg.integritySha256,
    reviewerId: "reviewer-2", reviewerLabel: "Reviewer",
    reviewedAt: "2026-11-09T12:02:00.000Z",
    outcome: "PASS_RECORDED_PENDING_OWNER_APPROVAL",
    checks: CHECK_IDS.map(checkId => ({ checkId, status: "PASS" })),
    evidence: CHECK_IDS.map((_, i) => ({ reference: "evidence-" + i, description: "Inspected source evidence " + i })),
    ownerApprovalRequired: true, activationAuthorized: false
  });
  const result = validateEnvelope(data);
  assert.equal(result.valid, true);
  assert.equal(result.reviewCount, 1);
});

test("rejects review records that claim activation or reuse the builder identity", () => {
  const data = fixture();
  data.reviews.push({
    packageId: data.package.packageId, integritySha256: data.package.integritySha256,
    reviewerId: "builder-1", reviewerLabel: "Same person",
    reviewedAt: "2026-11-09T12:02:00.000Z",
    outcome: "PASS_RECORDED_PENDING_OWNER_APPROVAL",
    checks: CHECK_IDS.map(checkId => ({ checkId, status: "PASS" })),
    evidence: CHECK_IDS.map((_, i) => ({ reference: "e-" + i, description: "Evidence " + i })),
    ownerApprovalRequired: true, activationAuthorized: true
  });
  assert.equal(validateEnvelope(data).code, "REVIEW_INVALID");
});
