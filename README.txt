MOBILE AI STUDIO — V1.2 DEVELOPMENT BRANCH
============================================

PURPOSE
Phone-first command station for the user's AI studio. The Android phone is the control surface; the PC is intended to host models, agent building, validation and approved backend work.

CURRENT BRANCH STATE
- V1.0 application foundation retained.
- V1.1 local Command Center retained.
- V1.2 local operations module added on feature/v1.2-live-command-station.
- This is development work and is not merged or published to the live site.

CURRENT V1.2 LOCAL FEATURES
- Local HOLD control: pauses new V1.2 task creation in this phone interface only. It does not stop PC processes.
- Enhanced task register with owner, priority, due date, details and status.
- Communications inbox for LOCAL DRAFT / NOT SENT messages.
- Approval queue with risk and evidence fields; decisions are recorded only and never execute actions.
- Timestamped local audit history for V1.2 operations events.

ORGANIZATION
- Preserve 29 agents plus six Floor Director / Independent Validator oversight roles.
- Existing agent and Galaxy views describe planned roles and reporting relationships.
- Role mission/responsibility wording is an initial draft and requires Owner review.
- Agent lifecycle remains PLANNED; no agent execution is enabled.

CONNECTION TRUTH
- PC backend: NOT CONNECTED / NOT TESTED.
- Quinn / Ollama: NOT CONNECTED.
- Agent dispatch: NOT CONFIGURED.
- Communications: LOCAL DRAFT / NOT SENT.
- Approval records do not execute actions.

SAFETY AND APPROVAL
- No agents are activated by this app.
- No external writes, publishing, deployment or autonomous execution are enabled.
- Human approval is required before consequential actions.
- Independent validation must be separate from the builder.

STORAGE
- V1.0 data uses localStorage key mobile-ai-studio-v1.
- V1.1 Command Center data uses mobile-ai-studio-command-center-v1.1.
- V1.2 operations data uses mobile-ai-studio-v1.2-operations.
- Export a backup before clearing browser data. Existing V1.0/V1.1 keys are not intentionally overwritten by the V1.2 operations module.

ANDROID TESTING REQUIRED
1. Open the development branch deployment only after it is separately published for testing.
2. Test Command Center, Galaxy, Directory and detail windows on Android Chrome.
3. Test task creation, completion, local HOLD, draft messages, approval recording and audit history.
4. Confirm data persists after closing and reopening the app.
5. Verify offline shell behavior and service-worker update behavior.
6. Confirm V1.0 projects, custom agent drafts and notes remain intact.

NOT YET IMPLEMENTED
- Secure authenticated PC backend bridge.
- Live hardware/system telemetry.
- Quinn/Ollama integration.
- Live agent messaging or task dispatch.
- Server-side authorization, identity verification or independent validation execution.

Do not merge or publish a release until the complete V1.2 scope has been implemented, tested and explicitly approved by the Owner.

V1.2 DEVELOPMENT DOCUMENTS
- docs/V1.2_LIVE_COMMAND_STATION_PLAN.md — phased architecture and scope.
- docs/V1.2_ANDROID_QA_ACCEPTANCE_MATRIX.md — physical-device test plan; not yet executed.
- docs/V1.2_SECURE_PC_BRIDGE_ARCHITECTURE.md — pairing, permissions, threat model and approval design; design only.
- v12-operations.js — local task, HOLD, draft communications, approval records and audit log.
- v12-organization.js — command roles and floor dashboards.

V1.2 organization dashboards are planning views, not running agent consoles. The PC bridge is design-only and has not been connected.

V1.2 AGENT WORKSPACES
- v12-workspaces.js adds local work proposals assigned to a canonical agent and same-floor manager.
- Proposals capture scope, acceptance criteria, priority and an optional prerequisite.
- Local workflow states: PROPOSED, ASSIGNED, IN_PROGRESS, READY_FOR_VALIDATION, ACCEPTED and CHANGES_REQUESTED.
- A prerequisite must be accepted before a dependent proposal can be locally assigned.
- The independent validation workspace requires reviewer-entered evidence and blocks a reviewer name that exactly matches the recorded builder name.
- Reviewer identity is not authenticated; this is a workflow guard, not proof of independence.
- No work is dispatched and no agent is started by these controls.
- Workspace records are stored separately under mobile-ai-studio-v1.2-workspaces.

V1.3 / V1.4 BRIDGE FOUNDATION STATUS
- V1.3 adds a phone-side voice/typed command surface, local notifications, pairing requirements display, and a truthful PC/Quinn/Ollama/telemetry status panel. These controls do not connect to or execute work on the PC.
- bridge/contract.cjs defines a reference request validator and in-memory replay guard. It is not a production security boundary.
- V1.4 adds bridge/simulator.cjs, an in-process simulator with no network listener, filesystem access, model access, telemetry access, agent dispatch, or execution.
- READ_STATUS returns SIMULATOR_ONLY / NOT_CONNECTED labels; READ_PROJECT uses synthetic metadata; PROPOSE_TASK and PROPOSE_ACTION create in-memory PROPOSED_NOT_DISPATCHED records; ADMIN_PAIRING is not implemented.
- tests/bridge-contract.test.cjs and tests/bridge-simulator.test.cjs are run by the Node 22 GitHub Actions workflow via node --test tests/*.test.cjs.
- V1.3 independent security review and Android acceptance documents are review/test packets only; no reviewer sign-off or physical Android test is claimed.
- No live PC listener, TLS pairing, durable replay store, credential storage, authenticated telemetry, Quinn/Ollama connection, remote push, agent dispatch, or remote execution is implemented.
- PR #6 remains draft and unmerged. Main and the published deployment remain untouched.

V1.5 SECURE PC HOST FOUNDATION
- bridge/host-policy.cjs is a pure fail-closed configuration policy evaluator; it is not a server or security boundary.
- Host startup is disabled by default. The reference policy requires explicit enablement, literal IPv4/IPv6 loopback binding, a valid port, TLS, authenticated device middleware, durable replay protection, redacted audit sink and recorded Owner approval.
- Wildcard/LAN binds are rejected. Agent dispatch and remote execution are always forbidden by this policy.
- POLICY_CHECKS_SATISFIED_NOT_STARTED means only that supplied config values satisfy the reference checklist; it does not mean a service is running or controls are technically implemented.
- tests/host-policy.test.cjs covers the fail-closed policy. No listener, pairing, credential store, telemetry endpoint, Quinn/Ollama connection or execution path exists.


V1.6 SECURE DEVICE PAIRING AND READ-ONLY HEALTH DESIGN
- docs/V1.6_DEVICE_PAIRING_PROTOCOL_AND_CREDENTIAL_LIFECYCLE.md defines one-time challenge requirements, Owner-bound enrollment, per-device credential lifecycle, revocation, rotation, protected storage, and fail-closed behavior. Design only; no pairing or credentials are implemented.
- docs/V1.6_READ_ONLY_HEALTH_AUTHORIZATION_AND_RECOVERY.md defines the proposed minimum READ_STATUS / READ_HEALTH scope, truthful freshness labels, and safe reconnect behavior. Design only; no live health endpoint exists.
- Pairing and health access remain disabled. No agent dispatch, project writes, telemetry stream, shell, process launch, or remote execution is authorized.
- V1.6 review gates remain open; independent security review and physical Android testing are not complete.


V1.7 SYNTHETIC PAIRING AND READ-ONLY AUTHORIZATION HARNESS
- bridge/pairing-simulator.cjs provides an in-memory, deterministic lifecycle model for pairing-window approval, synthetic challenge issue/expiry/consumption, Owner enrollment approval/rejection, read-only scope checks, revocation, and health snapshot freshness/recovery.
- tests/pairing-simulator.test.cjs exercises the lifecycle and fail-closed cases.
- docs/V1.7_SYNTHETIC_PAIRING_AND_AUTHORIZATION_HARNESS.md documents coverage and implementation gates.
- This is a test harness only: no cryptography, challenge secret, credential, TLS, network listener, persistence, Android Keystore, PC/Quinn/Ollama access, agent dispatch, or execution.
- All simulator health states are explicitly SIMULATOR_ONLY. V1.7 does not enable live pairing or host access.


V1.8 PHONE-TO-PC TRANSPORT AND SECURITY ARCHITECTURE
- docs/V1.8_PHONE_TO_PC_TRANSPORT_AND_TRUST_BOUNDARY.md explains why PC loopback cannot be reached from the phone and defines the gated evaluation of same-LAN HTTPS versus a private overlay path.
- docs/V1.8_THREAT_MODEL_AND_SECURITY_ACCEPTANCE.md defines the read-only connection threat model, abuse cases, minimum controls, evidence requirements and explicit live-trial gates.
- Browser PWA key storage is not represented as Android Keystore or hardware-backed protection. A native key broker/shell remains an evaluation option if physical Android testing shows the PWA cannot meet the security requirements.
- No transport has been selected for deployment. No listener, LAN bind, firewall rule, VPN/overlay, certificate, credential, cryptographic implementation, durable replay store, or live health endpoint has been created.
- Host remains disabled and loopback-only by default. No public exposure, Quinn/Ollama connection, agent dispatch, or remote execution is enabled or authorized.
- V1.8 is architecture and threat-model documentation only; all physical-device, independent-review, and Owner approval gates remain open.


V1.9 AGENT FACTORY CORE
- agent-factory/contract.cjs builds versioned blueprint-only packages from canonical agent definitions, enforces identity/floor/manager consistency and the least-privilege planning profile, and fingerprints package integrity.
- tests/agent-factory.test.cjs covers canonical identity, unsafe capability rejection, lifecycle/validation status protection, package tampering, independent-review separation, acceptance checks and evidence requirements.
- docs/V1.9_AGENT_FACTORY_CORE_AND_VALIDATION.md documents the factory contract and limitations.
- Independent review can be recorded only as PASS_RECORDED_PENDING_OWNER_APPROVAL. Reviewer identity and evidence references are caller-supplied and not authenticated by this library.
- This is the deterministic factory core, not model-powered agent generation or a running agent runtime. It does not activate, dispatch, execute, write projects, publish, deploy, or connect to Quinn/Ollama.

- agent-factory/browser-ui.js adds a phone-first Agent Factory workbench to the Agent Directory: select a canonical agent, build a blueprint package, inspect its JSON, and record a separate evidence-backed review.
- The browser workbench uses Web Crypto SHA-256 in the HTTPS secure context for package-integrity fingerprints. This fingerprint is not a signature or authentication mechanism.
- The workbench is local phone-side planning/review only. Reviewer identity is self-entered and not authenticated; evidence references are not independently fetched. No model is called and no generated agent is executed.
- GitHub Actions now syntax-checks the browser workbench and runs all Node contract, simulator and factory tests.
- V1.9 blueprint packages now include a role-specific system-instruction specification: mission, responsibilities, manager/floor reporting, prohibited capabilities, truthful evidence handling, output contract and Owner approval boundary. This is a prompt artifact only; no model is called and no tools are granted.



V3.4 / V3.5 DEVELOPMENT STATUS — 2026-11-10
- Main baseline at start of V3.5 work: V3.4 Agent Assurance & Self-Repair Planner merge commit 87dcd99eec5e6416de6b5fba1ae56561168fa8d7.
- V3.5 branch: feature/v3.5-arena-identity-agent-exchange. This is a separate draft implementation branch; main and the published Pages deployment are not changed by these commits.
- agent-arena.js / agent-arena.css add a phone-local Agent Arena roster preview, per-agent editable visual palette/avatar identity, and a ten-floor architecture display. Existing floors 0–4 and the 29-agent / six-oversight-role baseline are preserved; floors 5–9 are proposals, not active departments.
- Agent appearance is stored separately from role, instructions, permissions and validation. A visual identity never implies agent execution, capability or certification.
- Agent Exchange exports portable BLUEPRINT_ONLY JSON packages with a SHA-256 integrity fingerprint. Import validates format, required fields, identity options, security flags and fingerprint before saving a local imported draft.
- Exchange packages exclude credentials, private memory, tool grants, executable code and activation authority. Import does not overwrite canonical agents, install dependencies, activate or deploy.
- Public marketplace, payment, hosted distribution, creator authentication, remote update channels, actual Arena simulations, digital twins, autonomous training and live PC/Quinn/Ollama connection remain future work.
- V3.5 tests cover package integrity, tampering, unsafe tool/security flags, visual identity constraints, floor-plan preservation and offline shell wiring. GitHub Actions must pass before this branch is considered validated.
- Android physical-device acceptance, independent security review and Owner merge approval remain separate gates. No V3.5 production release or deployment is claimed.
