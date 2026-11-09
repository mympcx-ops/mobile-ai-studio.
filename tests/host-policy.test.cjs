"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createDefaultHostConfig,
  evaluateHostConfig
} = require("../bridge/host-policy.cjs");

function secureTestConfig(overrides = {}) {
  return {
    enabled: true,
    bindHost: "127.0.0.1",
    port: 43127,
    tlsConfigured: true,
    authenticatedDeviceMiddleware: true,
    durableReplayStore: true,
    redactedAuditSink: true,
    ownerApprovalRecorded: true,
    agentDispatchEnabled: false,
    executionEnabled: false,
    ...overrides
  };
}

test("default PC host configuration is disabled and has no operational permissions", () => {
  const config = createDefaultHostConfig();
  assert.equal(config.enabled, false);
  assert.equal(config.bindHost, "127.0.0.1");
  assert.equal(config.port, 0);
  assert.equal(config.agentDispatchEnabled, false);
  assert.equal(config.executionEnabled, false);
  assert.equal(evaluateHostConfig(config).allowed, false);
  assert.equal(evaluateHostConfig(config).state, "DISABLED_BY_DEFAULT");
});

test("complete test configuration satisfies policy checks but does not start a service", () => {
  const result = evaluateHostConfig(secureTestConfig());
  assert.equal(result.allowed, true);
  assert.equal(result.state, "POLICY_CHECKS_SATISFIED_NOT_STARTED");
  assert.equal(result.effective.agentDispatchEnabled, false);
  assert.equal(result.effective.executionEnabled, false);
});

test("public wildcard and LAN binds are rejected", () => {
  for (const bindHost of ["0.0.0.0", "::", "192.168.1.20", "10.0.0.5"]) {
    const result = evaluateHostConfig(secureTestConfig({ bindHost }));
    assert.equal(result.allowed, false, bindHost);
    assert.ok(result.errors.includes("NON_LOOPBACK_BIND_REJECTED"));
  }
});

test("loopback hostnames and addresses are accepted by the policy", () => {
  for (const bindHost of ["127.0.0.1", "::1"]) {
    assert.equal(evaluateHostConfig(secureTestConfig({ bindHost })).allowed, true);
  }
});

test("invalid ports are rejected", () => {
  for (const port of [0, -1, 65536, 1.5, "43127", null]) {
    const result = evaluateHostConfig(secureTestConfig({ port }));
    assert.equal(result.allowed, false);
    assert.ok(result.errors.includes("INVALID_PORT"));
  }
});

test("missing TLS, authentication, replay, audit or Owner approval blocks policy", () => {
  const flags = [
    "tlsConfigured",
    "authenticatedDeviceMiddleware",
    "durableReplayStore",
    "redactedAuditSink",
    "ownerApprovalRecorded"
  ];
  for (const flag of flags) {
    const result = evaluateHostConfig(secureTestConfig({ [flag]: false }));
    assert.equal(result.allowed, false, flag);
    assert.ok(result.errors.includes("REQUIRED_CONTROL_MISSING:" + flag));
  }
});

test("agent dispatch and remote execution can never be enabled by host policy", () => {
  for (const key of ["agentDispatchEnabled", "executionEnabled"]) {
    const result = evaluateHostConfig(secureTestConfig({ [key]: true }));
    assert.equal(result.allowed, false);
    assert.ok(result.errors.includes(key === "agentDispatchEnabled"
      ? "AGENT_DISPATCH_FORBIDDEN"
      : "REMOTE_EXECUTION_FORBIDDEN"));
    assert.equal(result.effective.agentDispatchEnabled, false);
    assert.equal(result.effective.executionEnabled, false);
  }
});

test("disabled host remains blocked even when other settings are complete", () => {
  const result = evaluateHostConfig(secureTestConfig({ enabled: false }));
  assert.equal(result.allowed, false);
  assert.equal(result.state, "DISABLED_BY_DEFAULT");
});

test("null, arrays and non-object inputs fail closed", () => {
  for (const input of [null, undefined, [], "enabled", 42]) {
    const result = evaluateHostConfig(input);
    assert.equal(result.allowed, false);
  }
});

test("policy result does not claim that a PC service is running", () => {
  const result = evaluateHostConfig(secureTestConfig());
  assert.equal(result.state, "POLICY_CHECKS_SATISFIED_NOT_STARTED");
  assert.equal(Object.hasOwn(result, "listening"), false);
  assert.equal(Object.hasOwn(result, "connected"), false);
});
