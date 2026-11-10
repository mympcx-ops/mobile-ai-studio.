# Prompt-to-Agent Intelligence v1.0

## Purpose
A phone-first prompt-to-agent planner. The Owner describes an agent's mission in natural language; the local planner recommends a floor, tool capabilities, least-privilege permission profile, workflow and a mission-specific validation plan.

## Current implementation
- Deterministic, offline keyword matching against a versioned capability catalog.
- Generates a non-executable blueprint with suggested tools, scopes, workflow, reporting requirements and five validation scenarios.
- Saves drafts only in this browser's local storage and supports manual JSON export.
- Tool assignment is recommendation only. No tools are installed, granted or executed.
- Host shell, host filesystem writes, local model dispatch, publish and deploy are explicitly excluded from automatic assignment.
- Owner approval and independent validation remain mandatory.

## Important limitation
This release is a deterministic local planner, not an LLM-powered interpretation engine and not a Quinn connection. It is the safe phone-side foundation for a future Quinn planning service. The PC-side broker must later resolve capability IDs against a trusted registry, validate permissions, and execute only approved tools in an isolated sandbox.

## Future integration gates
1. Connect the phone prompt to Quinn only after authenticated host pairing is implemented and independently reviewed.
2. Replace or augment keyword matching with Quinn's structured task analysis; preserve schema validation and default-deny permissions.
3. Add tool availability discovery, dependency checks and missing-tool proposals.
4. Add isolated execution and evidence collection through the Tool Broker.
5. Add separate Validator review and Owner approval before canonical registration, activation or deployment.
