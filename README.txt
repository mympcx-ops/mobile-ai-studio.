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
