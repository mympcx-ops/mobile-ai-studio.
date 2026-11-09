# Mobile AI Studio — Coordinated Master Pass

## Purpose
Deliver one phone-first control surface that consolidates the existing Command Center, 35-role organization, Agent Factory, workspaces, validation records, offline shell, and secure PC-bridge design. The Android phone remains the user-facing interface. The PC remains a backend host and is not assumed reachable while this milestone is developed from the phone.

## Integrated scope
- **Command station:** local tasks, draft communications, approval queue, audit timeline, HOLD controls, readiness and executive views.
- **Agent Factory:** canonical agent selection, blueprint-only package generation, integrity fingerprinting, independent review record, and Owner approval boundary.
- **Organization:** 29 planned agents, seven managers, and six oversight roles across Music, Media, and Racing. Mission/responsibility text remains an Owner-reviewable draft where applicable.
- **Validation:** deterministic contract tests, simulator tests, Factory acceptance checks, evidence records, and a separate physical Android acceptance run.
- **Security:** deny-by-default host policy; synthetic pairing only; no live credentials, network listener, remote execution, agent dispatch, or external writes.
- **Offline:** local storage and service-worker shell; backup/restore remains phone-side. Offline claims require a physical Android test.
- **PC integration:** read-only status/health contract first; transport, cryptographic device identity, protected key storage, durable replay defense, authenticated telemetry, and independent security review are mandatory before any live trial.

## Master Pass Control Board
The master-pass.js module adds a consolidated phone-side status board to the Command Center. It reads existing local records and reports their status without changing them. It explicitly distinguishes local/browser state from actual PC/backend state.

## Authority and safety invariants
1. Owner remains the final approval authority.
2. Builders cannot independently validate their own package.
3. A recorded review is not a technical certification or activation.
4. No agent is running or dispatched by the phone UI.
5. Local HOLD does not stop PC processes.
6. PC/Quinn/Ollama remain NOT CONNECTED until a separately approved, authenticated implementation is physically tested.
7. No arbitrary shell, PowerShell, process launch, filesystem path, generic URL fetch, publishing, or deployment action is exposed.
8. Main and the published release remain unchanged; this work stays on the development branch and PR #6 remains draft/unmerged.

## Acceptance gates
- Automated Node 22 syntax and regression suite passes on the development branch.
- The roster integrity test confirms 29 agents, seven managers, and six oversight roles.
- Every local JavaScript entry point is included in the service-worker precache.
- The master board preserves truthful disconnected/disabled labels.
- Physical Android Chrome/PWA tests cover install, small-screen layout, persistence, offline reload, service-worker update, backup/restore, and existing V1.0 data preservation.
- Independent security reviewer examines the actual bridge implementation and evidence.
- Owner explicitly approves any release or live PC trial.

## Current limitations
The master board is a local status aggregator, not a PC health monitor. The Agent Factory is a blueprint and review workflow, not a model-powered autonomous agent runtime. The pairing harness is synthetic, not cryptographic pairing. Browser test results do not substitute for Android-device testing or independent security review.
