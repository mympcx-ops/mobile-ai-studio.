"use strict";

// Local-only protocol simulator. No sockets, filesystem access, model calls,
// persistence, PC telemetry, agent dispatch, or executable action support.
const { NonceLedger, validateRequest } = require("./contract.cjs");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createBridgeSimulator(options = {}) {
  const clock = typeof options.clock === "function" ? options.clock : () => Date.now();
  const serviceVersion = options.serviceVersion || "1.4.0-simulator";
  const maxProposals = Number.isInteger(options.maxProposals) && options.maxProposals > 0
    ? Math.min(options.maxProposals, 500)
    : 100;
  const nonceLedger = new NonceLedger({
    ttlMs: 5 * 60 * 1000,
    maxEntries: 10000
  });
  const proposals = [];
  let sequence = 0;

  function response(requestId, status, nowMs, extra = {}) {
    return {
      protocol: "mobile-ai-studio-bridge/1",
      requestId: typeof requestId === "string" ? requestId : null,
      serverTime: new Date(nowMs).toISOString(),
      observedAt: new Date(nowMs).toISOString(),
      serviceVersion,
      status,
      simulation: true,
      ...extra
    };
  }

  function handle(envelope, principal) {
    const nowMs = clock();
    const checked = validateRequest(envelope, principal, nonceLedger, nowMs);
    if (!checked.ok) {
      return response(envelope && envelope.requestId, "REJECTED", nowMs, {
        code: checked.code,
        message: "Request rejected by the local protocol simulator."
      });
    }

    if (checked.action === "READ_STATUS") {
      return response(checked.requestId, "OK", nowMs, {
        data: {
          environment: "SIMULATOR_ONLY",
          pcBackend: "NOT_CONNECTED",
          quinn: "NOT_CONNECTED",
          ollama: "NOT_CONNECTED",
          telemetry: "NOT_AVAILABLE",
          agentDispatch: "DISABLED",
          execution: "DISABLED",
          note: "These are simulator labels, not observations from the PC."
        }
      });
    }

    if (checked.action === "READ_PROJECT") {
      return response(checked.requestId, "OK", nowMs, {
        data: {
          projectId: envelope.args.projectId,
          availability: "SYNTHETIC_ONLY",
          source: "SIMULATOR_FIXTURE",
          note: "No PC filesystem or real project was accessed."
        }
      });
    }

    if (checked.action === "PROPOSE_TASK" || checked.action === "PROPOSE_ACTION") {
      if (proposals.length >= maxProposals) {
        return response(checked.requestId, "REJECTED", nowMs, {
          code: "SIMULATOR_CAPACITY_REACHED"
        });
      }
      sequence += 1;
      const proposal = {
        proposalId: "SIM-PROPOSAL-" + String(sequence).padStart(6, "0"),
        kind: checked.action,
        state: "PROPOSED_NOT_DISPATCHED",
        createdAt: new Date(nowMs).toISOString(),
        payload: clone(envelope.args)
      };
      proposals.push(proposal);
      return response(checked.requestId, "OK", nowMs, {
        data: clone(proposal)
      });
    }

    // ADMIN_PAIRING is deliberately not simulated as an operational action.
    return response(checked.requestId, "REJECTED", nowMs, {
      code: "SIMULATOR_ACTION_NOT_IMPLEMENTED"
    });
  }

  return Object.freeze({
    handle,
    listProposals: () => clone(proposals),
    getDiagnostics: () => ({
      mode: "SIMULATOR_ONLY",
      networkListener: false,
      filesystemAccess: false,
      modelAccess: false,
      telemetryAccess: false,
      agentDispatch: false,
      execution: false,
      proposalCount: proposals.length
    })
  });
}

module.exports = { createBridgeSimulator };
