"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createBridgeSimulator } = require("../bridge/simulator.cjs");

const NOW = 1_800_000_000_000;
const fullPrincipal = {
  authenticated: true,
  deviceId: "device-00000001",
  scopes: ["READ_STATUS", "READ_PROJECT", "PROPOSE_TASK", "PROPOSE_ACTION", "ADMIN_PAIRING"]
};
let requestCounter = 0;
function request(action, args = {}) {
  requestCounter += 1;
  return {
    protocol: "mobile-ai-studio-bridge/1",
    requestId: "sim-request-" + String(requestCounter).padStart(8, "0"),
    deviceId: "device-00000001",
    timestamp: NOW,
    nonce: "nonce_" + String(requestCounter).padStart(16, "0"),
    action,
    args
  };
}

test("simulator reports SIMULATOR_ONLY and never claims a real PC connection", () => {
  const sim = createBridgeSimulator({ clock: () => NOW });
  const result = sim.handle(request("READ_STATUS"), fullPrincipal);
  assert.equal(result.status, "OK");
  assert.equal(result.simulation, true);
  assert.equal(result.data.environment, "SIMULATOR_ONLY");
  assert.equal(result.data.pcBackend, "NOT_CONNECTED");
  assert.equal(result.data.quinn, "NOT_CONNECTED");
  assert.equal(result.data.ollama, "NOT_CONNECTED");
  assert.equal(result.data.telemetry, "NOT_AVAILABLE");
});

test("project reads return synthetic fixtures and do not touch a filesystem", () => {
  const sim = createBridgeSimulator({ clock: () => NOW });
  const result = sim.handle(request("READ_PROJECT", { projectId: "demo-project" }), fullPrincipal);
  assert.equal(result.status, "OK");
  assert.equal(result.data.projectId, "demo-project");
  assert.equal(result.data.availability, "SYNTHETIC_ONLY");
  assert.equal(sim.getDiagnostics().filesystemAccess, false);
});

test("task proposals are recorded but never dispatched", () => {
  const sim = createBridgeSimulator({ clock: () => NOW });
  const result = sim.handle(request("PROPOSE_TASK", {
    title: "Example task",
    description: "Synthetic test only",
    acceptanceCriteria: ["A proposal is recorded"]
  }), fullPrincipal);
  assert.equal(result.status, "OK");
  assert.equal(result.data.state, "PROPOSED_NOT_DISPATCHED");
  assert.equal(sim.listProposals().length, 1);
  assert.equal(sim.getDiagnostics().agentDispatch, false);
  assert.equal(sim.getDiagnostics().execution, false);
});

test("action proposals remain proposals and are not executed", () => {
  const sim = createBridgeSimulator({ clock: () => NOW });
  const result = sim.handle(request("PROPOSE_ACTION", {
    title: "Synthetic action",
    summary: "Must remain a proposal",
    risk: "low",
    rollbackPlan: "No action occurred"
  }), fullPrincipal);
  assert.equal(result.status, "OK");
  assert.equal(result.data.state, "PROPOSED_NOT_DISPATCHED");
  assert.equal(sim.getDiagnostics().execution, false);
});

test("untrusted callers are rejected", () => {
  const sim = createBridgeSimulator({ clock: () => NOW });
  const result = sim.handle(request("READ_STATUS"), {
    ...fullPrincipal,
    authenticated: false
  });
  assert.equal(result.status, "REJECTED");
  assert.equal(result.code, "UNAUTHENTICATED_DEVICE");
});

test("least-privilege scope is enforced by the shared contract", () => {
  const sim = createBridgeSimulator({ clock: () => NOW });
  const result = sim.handle(request("PROPOSE_TASK", {
    title: "Example",
    description: "No dispatch",
    acceptanceCriteria: ["Only a proposal"]
  }), {
    ...fullPrincipal,
    scopes: ["READ_STATUS"]
  });
  assert.equal(result.status, "REJECTED");
  assert.equal(result.code, "INSUFFICIENT_SCOPE");
});

test("replayed requests are rejected", () => {
  const sim = createBridgeSimulator({ clock: () => NOW });
  const req = request("READ_STATUS");
  assert.equal(sim.handle(req, fullPrincipal).status, "OK");
  const replay = sim.handle(req, fullPrincipal);
  assert.equal(replay.status, "REJECTED");
  assert.equal(replay.code, "REPLAY_OR_NONCE_CAPACITY");
});

test("ADMIN_PAIRING does not operate even with the pairing scope", () => {
  const sim = createBridgeSimulator({ clock: () => NOW });
  const result = sim.handle(request("ADMIN_PAIRING", { operation: "list_devices" }), fullPrincipal);
  assert.equal(result.status, "REJECTED");
  assert.equal(result.code, "SIMULATOR_ACTION_NOT_IMPLEMENTED");
});

test("proposal capacity fails closed", () => {
  const sim = createBridgeSimulator({ clock: () => NOW, maxProposals: 1 });
  const args = {
    title: "Example",
    description: "Bounded",
    acceptanceCriteria: ["No dispatch"]
  };
  assert.equal(sim.handle(request("PROPOSE_TASK", args), fullPrincipal).status, "OK");
  const second = sim.handle(request("PROPOSE_TASK", args), fullPrincipal);
  assert.equal(second.status, "REJECTED");
  assert.equal(second.code, "SIMULATOR_CAPACITY_REACHED");
  assert.equal(sim.listProposals().length, 1);
});

test("diagnostics prove the simulator has no operational integrations", () => {
  const sim = createBridgeSimulator({ clock: () => NOW });
  assert.deepEqual(sim.getDiagnostics(), {
    mode: "SIMULATOR_ONLY",
    networkListener: false,
    filesystemAccess: false,
    modelAccess: false,
    telemetryAccess: false,
    agentDispatch: false,
    execution: false,
    proposalCount: 0
  });
});
