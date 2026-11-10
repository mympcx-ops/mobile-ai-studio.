"use strict";

// Offline-only validator for Mobile AI Studio phone exports.
// This module is deliberately pure: it reads no files, writes no files,
// starts no processes, opens no sockets, and never installs or executes agents.
const crypto = require("node:crypto");

const FORMAT = "mobile-ai-studio-agent-package-export/1";
const MAX_INPUT_BYTES = 1024 * 1024;
const CHECK_IDS = [
  "IDENTITY_AND_ROLE_MATCH",
  "MISSION_AND_RESPONSIBILITIES_PRESENT",
  "FLOOR_AND_MANAGER_RELATIONSHIP_VALID",
  "LEAST_PRIVILEGE_PROFILE_VALID",
  "NO_EXECUTION_OR_EXTERNAL_WRITE_CAPABILITY",
  "DEPENDENCIES_AND_OUTPUTS_DOCUMENTED",
  "OWNER_REVIEW_REQUIRED"
];
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function fail(code, message) {
  return { valid: false, status: "REJECTED", code, message };
}

function canonical(value, seen = new Set()) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (seen.has(value)) throw new Error("Cyclic data is not valid JSON.");
  seen.add(value);
  let result;
  if (Array.isArray(value)) {
    result = "[" + value.map(item => canonical(item, seen)).join(",") + "]";
  } else {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new Error("Only plain JSON objects are accepted.");
    const keys = Object.keys(value).sort();
    if (keys.some(key => FORBIDDEN_KEYS.has(key))) throw new Error("Unsafe object key detected.");
    result = "{" + keys.map(key => JSON.stringify(key) + ":" + canonical(value[key], seen)).join(",") + "}";
  }
  seen.delete(value);
  return result;
}

function sha256(value) {
  return crypto.createHash("sha256").update(canonical(value), "utf8").digest("hex");
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validIsoDate(value) {
  if (!hasText(value) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  return Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function inspectKeys(value, path = "$") {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) inspectKeys(value[i], path + "[" + i + "]");
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) throw new Error("Unsafe key at " + path + "." + key);
    inspectKeys(child, path + "." + key);
  }
}

function validateReview(review, pkg) {
  if (!isObject(review)) return "Review record must be a JSON object.";
  if (review.packageId !== pkg.packageId || review.integritySha256 !== pkg.integritySha256) {
    return "Review does not match the selected package identity and fingerprint.";
  }
  if (!hasText(review.reviewerId) || !hasText(review.reviewerLabel) ||
      review.reviewerId === pkg.provenance.builderId) {
    return "Review identity is missing or matches the package builder.";
  }
  if (!validIsoDate(review.reviewedAt)) return "Review timestamp is invalid.";
  if (review.outcome !== "PASS_RECORDED_PENDING_OWNER_APPROVAL") {
    return "Only a recorded PASS pending Owner approval may accompany this package.";
  }
  if (review.ownerApprovalRequired !== true || review.activationAuthorized !== false) {
    return "Review must preserve the Owner approval gate and deny activation.";
  }
  if (!Array.isArray(review.checks) || review.checks.length !== CHECK_IDS.length) {
    return "Review must contain exactly seven acceptance checks.";
  }
  for (let i = 0; i < CHECK_IDS.length; i++) {
    if (review.checks[i]?.checkId !== CHECK_IDS[i] || review.checks[i]?.status !== "PASS") {
      return "Review acceptance checks are incomplete or out of canonical order.";
    }
  }
  if (!Array.isArray(review.evidence) || review.evidence.length !== CHECK_IDS.length ||
      review.evidence.some(item => !isObject(item) || !hasText(item.reference) || !hasText(item.description))) {
    return "Review must contain seven non-empty evidence declarations.";
  }
  return null;
}

function validateEnvelope(input) {
  let envelope = input;
  if (typeof input === "string") {
    if (Buffer.byteLength(input, "utf8") > MAX_INPUT_BYTES) {
      return fail("INPUT_TOO_LARGE", "Import file exceeds the 1 MiB validation limit.");
    }
    try { envelope = JSON.parse(input); }
    catch { return fail("INVALID_JSON", "Import file is not valid JSON."); }
  } else {
    try {
      if (Buffer.byteLength(JSON.stringify(input), "utf8") > MAX_INPUT_BYTES) {
        return fail("INPUT_TOO_LARGE", "Import payload exceeds the 1 MiB validation limit.");
      }
    } catch {
      return fail("INVALID_INPUT", "Input is not serializable JSON data.");
    }
  }

  try { inspectKeys(envelope); }
  catch (error) { return fail("UNSAFE_JSON_KEY", error.message); }

  if (!isObject(envelope)) return fail("INVALID_ENVELOPE", "Envelope must be a JSON object.");
  const envelopeKeys = Object.keys(envelope).sort().join(",");
  if (envelopeKeys !== ["exportedAt", "format", "package", "reviews", "transfer"].sort().join(",")) {
    return fail("ENVELOPE_FIELDS", "Envelope contains missing or unexpected top-level fields.");
  }
  if (envelope.format !== FORMAT) return fail("UNSUPPORTED_FORMAT", "Export format is not supported.");
  if (!validIsoDate(envelope.exportedAt)) return fail("INVALID_EXPORT_TIME", "Export timestamp is invalid.");
  if (!isObject(envelope.transfer) ||
      envelope.transfer.mode !== "OFFLINE_FILE_EXPORT" ||
      envelope.transfer.destination !== "MANUAL_PC_IMPORT_REQUIRED" ||
      envelope.transfer.automaticInstall !== false ||
      envelope.transfer.executionAuthorized !== false ||
      Object.keys(envelope.transfer).length !== 4) {
    return fail("TRANSFER_POLICY", "Transfer metadata is missing or attempts to authorize installation or execution.");
  }

  const pkg = envelope.package;
  if (!isObject(pkg) || !hasText(pkg.packageId) ||
      pkg.packageType !== "AGENT_BLUEPRINT_ONLY" ||
      pkg.packageStatus !== "BUILT_PENDING_INDEPENDENT_VALIDATION" ||
      pkg.factoryVersion !== "1.0.0" || !hasText(pkg.integritySha256) ||
      !/^[a-f0-9]{64}$/.test(pkg.integritySha256)) {
    return fail("PACKAGE_SHAPE", "Package identity, version, type, status, or fingerprint is invalid.");
  }
  if (!isObject(pkg.agent) || !hasText(pkg.agent.id) || !hasText(pkg.agent.name) ||
      !hasText(pkg.agent.floor) || !hasText(pkg.agent.manager) ||
      !hasText(pkg.agent.mission) || !hasText(pkg.agent.responsibilities)) {
    return fail("AGENT_IDENTITY", "Canonical agent identity, floor, manager, mission, or responsibilities are incomplete.");
  }
  if (!isObject(pkg.provenance) || !hasText(pkg.provenance.builderId) ||
      !hasText(pkg.provenance.builderLabel) || !validIsoDate(pkg.provenance.builtAt) ||
      typeof pkg.provenance.scopeNotes !== "string") {
    return fail("PROVENANCE", "Builder provenance is incomplete or malformed.");
  }

  const expectedProfile = {
    localRead: true, localWrite: false, externalNetwork: false,
    execute: false, publish: false, deploy: false, humanApprovalRequired: true
  };
  if (!isObject(pkg.agent.permissionProfile) ||
      canonical(pkg.agent.permissionProfile) !== canonical(expectedProfile)) {
    return fail("PERMISSION_PROFILE", "Agent permission profile does not match the least-privilege blueprint profile.");
  }

  const safety = pkg.safety;
  if (!isObject(safety) || safety.executable !== false ||
      safety.dispatchEnabled !== false || safety.externalWritesEnabled !== false ||
      safety.publishEnabled !== false || safety.deployEnabled !== false ||
      safety.secretsIncluded !== false || safety.ownerApprovalRequiredForActivation !== true) {
    return fail("PACKAGE_SAFETY", "Package safety flags are missing or do not fail closed.");
  }

  const instruction = pkg.agentInstruction;
  const expectedOutputFields = ["status", "summary", "deliverables", "evidence", "assumptions", "risks", "blockers", "approvalRequired"];
  const expectedInstruction = [
    "You are " + pkg.agent.name + ", a planned specialist agent in the " + pkg.agent.floor + " floor of Mobile AI Studio.",
    "MISSION: " + pkg.agent.mission,
    "RESPONSIBILITIES: " + pkg.agent.responsibilities,
    "REPORTING: Report work proposals and findings to " + (instruction?.reportsTo || "") + "; escalate through " + (instruction?.floorDirector || "") + ". Independent review is performed by " + (instruction?.independentValidator || "the floor Independent Validator") + ".",
    "PERMISSIONS: Planning and read-only analysis only. No command execution, process launch, file modification, arbitrary path access, external network, publishing, deployment, agent dispatch, or credential access.",
    "APPROVAL: Never represent a proposal as approved or completed. Escalate consequential actions to the Owner. Independent validation must be separate from the builder.",
    "TRUTHFULNESS: Distinguish observed evidence, user-provided information, assumptions, and recommendations. Never invent test results or completion status.",
    "OUTPUT: Return status, summary, deliverables, evidence, assumptions, risks, blockers, and approvalRequired.",
    "LIFECYCLE: This instruction package is a blueprint. It does not authorize activation or execution."
  ].join("\n");
  const capabilityKeys = ["toolExecution", "filesystemWrite", "externalNetwork", "agentDispatch", "publish", "deploy", "credentialAccess", "ownerApprovalRequired"];
  if (!isObject(instruction) || instruction.templateVersion !== "1.0.0" ||
      instruction.agentId !== pkg.agent.id || instruction.role !== pkg.agent.name ||
      instruction.floor !== pkg.agent.floor || !hasText(instruction.reportsTo) ||
      !hasText(instruction.floorDirector) || !hasText(instruction.independentValidator) ||
      instruction.systemInstruction !== expectedInstruction ||
      !isObject(instruction.capabilities) ||
      Object.keys(instruction.capabilities).sort().join(",") !== capabilityKeys.slice().sort().join(",") ||
      capabilityKeys.slice(0, 7).some(key => instruction.capabilities[key] !== false) ||
      instruction.capabilities.ownerApprovalRequired !== true ||
      !isObject(instruction.outputContract) ||
      Object.keys(instruction.outputContract).sort().join(",") !== ["mustDistinguishEvidenceFromInference", "requiredFields"].sort().join(",") ||
      instruction.outputContract.mustDistinguishEvidenceFromInference !== true ||
      canonical(instruction.outputContract.requiredFields) !== canonical(expectedOutputFields) ||
      pkg.agent.lifecycleStatus !== "PLANNED" ||
      pkg.agent.builderStatus !== "BUILT_PENDING_VALIDATION" ||
      pkg.agent.validationStatus !== "NOT_RUN") {
    return fail("INSTRUCTION_POLICY", "Agent instruction, lifecycle, or capability contract is incomplete, altered, or unsafe.");
  }

  if (!Array.isArray(pkg.acceptanceChecks) || pkg.acceptanceChecks.length !== CHECK_IDS.length) {
    return fail("ACCEPTANCE_CHECKS", "Package must contain exactly seven canonical acceptance checks.");
  }
  for (let i = 0; i < CHECK_IDS.length; i++) {
    if (pkg.acceptanceChecks[i]?.checkId !== CHECK_IDS[i] ||
        pkg.acceptanceChecks[i]?.status !== "NOT_RUN") {
      return fail("ACCEPTANCE_CHECKS", "Built package checks must remain NOT_RUN until a separate review.");
    }
  }

  const { packageId, integritySha256, ...body } = pkg;
  let computed;
  try { computed = sha256(body); }
  catch (error) { return fail("CANONICALIZATION", error.message); }
  if (computed !== integritySha256) return fail("INTEGRITY_MISMATCH", "Package SHA-256 does not match its canonical contents.");

  if (!Array.isArray(envelope.reviews)) return fail("REVIEWS_SHAPE", "Reviews must be an array.");
  for (const review of envelope.reviews) {
    const issue = validateReview(review, pkg);
    if (issue) return fail("REVIEW_INVALID", issue);
  }

  return {
    valid: true,
    status: "VALIDATED_UNTRUSTED_PROPOSAL",
    packageId: pkg.packageId,
    agentId: pkg.agent.id,
    agentName: pkg.agent.name,
    integritySha256: computed,
    reviewCount: envelope.reviews.length,
    ownerApprovalRequired: true,
    installationAuthorized: false,
    executionAuthorized: false,
    stagingRequired: true,
    warnings: [
      "SHA-256 verifies package integrity only; it does not authenticate the builder, reviewer, or transfer channel.",
      "Review identities and evidence declarations are user-entered and are not independently authenticated.",
      "Validation does not install, activate, dispatch, publish, execute, or connect to a model runtime."
    ]
  };
}

module.exports = { FORMAT, MAX_INPUT_BYTES, CHECK_IDS, canonical, sha256, validateEnvelope };
