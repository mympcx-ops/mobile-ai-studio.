# V3.0 PC Host Bridge Contract

## Current implementation status

The phone UI can create and export an unsigned, expiring pairing request and can export a non-executable Agent Factory blueprint. **No PC host is installed, no network request is sent, and no device is paired.** This document is a contract for the future PC-side implementation, not a claim that the bridge is operational.

## Required architecture

- Phone is the Owner command surface; the PC is a backend host only.
- PC host must bind to loopback by default. Remote/LAN access must not be enabled until TLS and device authentication are configured and independently tested.
- Require HTTPS with certificate pinning or an equivalent authenticated trust bootstrap. Never accept plaintext HTTP for LAN pairing.
- Pairing requests are one-time, expire after five minutes, and must be consumed once. Nonces must be tracked to prevent replay.
- Device identity must be established by a cryptographic challenge-response. A request ID or user-entered label is not authentication.
- Use a short-lived session token with scoped capabilities, rotation, revocation and an audit trail. Never store long-lived host secrets in browser localStorage.
- Default capability set: health.read, telemetry.read, agent-package.preview. All are read-only.
- No arbitrary shell, process launch, filesystem write, model dispatch, agent activation, publish, deploy, or credential retrieval in V3.0.
- Agent package import must recompute SHA-256, validate the schema, run independent validation, and remain PLANNED until explicit Owner approval. A passing review is not activation authority.
- Every request must include a request ID, timestamp, nonce and authenticated device/session context. Reject expired requests, replayed nonces, unknown capabilities and oversized payloads.
- Host must provide a kill switch and a local audit log. Owner HOLD must deny new requests; it must not be represented as stopping already-running PC processes.

## Proposed read-only endpoints (not implemented)

- GET /v3/health — host service status, version and uptime.
- GET /v3/capabilities — capability allowlist and policy version.
- GET /v3/telemetry/snapshot — allowlisted resource telemetry only.
- POST /v3/pairing/consume — one-time pairing challenge; only after TLS/authentication bootstrap exists.
- POST /v3/agent-packages/preview — schema/hash validation only; never install or execute.

## Acceptance gates

1. Threat model and protocol schema reviewed.
2. PC host implementation binds safely and passes negative tests.
3. TLS identity, pairing expiry, replay prevention and revocation pass independent tests.
4. Read-only endpoints expose only allowlisted data.
5. Phone verifies host identity and refuses downgrade/plaintext.
6. Package transfer remains inert and hash/schema checked.
7. Owner approves any later capability expansion separately.

No endpoint above is called by the current phone application.
