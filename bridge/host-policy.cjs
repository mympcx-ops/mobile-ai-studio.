"use strict";

// V1.5 PC host startup policy evaluator.
// This is a pure configuration gate, NOT a listener, TLS implementation,
// authenticator, durable replay store, audit sink, or production security boundary.

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

const REQUIRED_TRUE_FLAGS = Object.freeze([
  "tlsConfigured",
  "authenticatedDeviceMiddleware",
  "durableReplayStore",
  "redactedAuditSink",
  "ownerApprovalRecorded"
]);

function createDefaultHostConfig() {
  return Object.freeze({
    enabled: false,
    bindHost: "127.0.0.1",
    port: 0,
    tlsConfigured: false,
    authenticatedDeviceMiddleware: false,
    durableReplayStore: false,
    redactedAuditSink: false,
    ownerApprovalRecorded: false,
    agentDispatchEnabled: false,
    executionEnabled: false
  });
}

function evaluateHostConfig(input) {
  const config = input && typeof input === "object" && !Array.isArray(input)
    ? input
    : {};
  const errors = [];

  if (config.enabled !== true) {
    return Object.freeze({
      allowed: false,
      state: "DISABLED_BY_DEFAULT",
      errors: Object.freeze(["HOST_DISABLED"]),
      effective: Object.freeze({
        bindHost: "127.0.0.1",
        port: 0,
        agentDispatchEnabled: false,
        executionEnabled: false
      })
    });
  }

  if (typeof config.bindHost !== "string" || !LOOPBACK_HOSTS.has(config.bindHost)) {
    errors.push("NON_LOOPBACK_BIND_REJECTED");
  }
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    errors.push("INVALID_PORT");
  }
  for (const flag of REQUIRED_TRUE_FLAGS) {
    if (config[flag] !== true) errors.push("REQUIRED_CONTROL_MISSING:" + flag);
  }
  if (config.agentDispatchEnabled === true) errors.push("AGENT_DISPATCH_FORBIDDEN");
  if (config.executionEnabled === true) errors.push("REMOTE_EXECUTION_FORBIDDEN");

  return Object.freeze({
    allowed: errors.length === 0,
    state: errors.length === 0 ? "POLICY_CHECKS_SATISFIED_NOT_STARTED" : "BLOCKED",
    errors: Object.freeze(errors),
    effective: Object.freeze({
      bindHost: config.bindHost,
      port: config.port,
      agentDispatchEnabled: false,
      executionEnabled: false
    })
  });
}

module.exports = {
  LOOPBACK_HOSTS,
  REQUIRED_TRUE_FLAGS,
  createDefaultHostConfig,
  evaluateHostConfig
};
