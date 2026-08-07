# Plan: OpenCode Integration Endpoint Candidate Source

## Goal

Prepare local `@adrouter/opencode@0.1.0-beta.6` source for the isolated Router integration API and
bottom-footer sponsorship contract, without committing, publishing, tagging, pushing, changing
repository visibility, or deploying either side of the contract.

## Context

- Public beta.4 remains the last published OpenCode package; beta.6 was verified unused.
- The unrelated beta.5 installation-auth experiment remains untouched in
  `stash@{0}: clean-slate-2026-08-02`.
- Router integration endpoint, key entitlement, and migration work are local source only. A passing
  plugin test does not establish hosted access.
- The workspace-level roadmap and validation record live in
  `/Users/ahmadzuhri/antigravity/3days/PLAN.md`.

## Constraints

- Sponsor and settlement data remain display/accounting metadata only.
- Use only `ADROUTER_INTEGRATION_API_KEY` / `adr_int_` credentials for hosted integration access.
- Preserve the `adrouter` provider/plugin IDs and root, `./server`, and `./tui` exports.
- Preserve Bun 1.3.14, the authoritative `bun.lock`, strict transport bounds, and OpenCode
  `>=1.18.4 <2` compatibility.
- Do not mutate the stash, npm channels, GitHub state, hosted services, or release credentials.

## Step A: Reconcile the provider contract

### Status

`done`

### Completed Work

- Switched transport to endpoint-scoped `POST /v1/integrations/turn` authentication.
- Registered all eight Router model IDs, exact context windows, and reasoning variants.
- Kept integration prompts text/tool-only with a conservative 4,096-token output cap.
- Rejected legacy CLI/Desktop credential names and shapes on hosted origins.

### Validation Results

- `bun run lint`: passed.
- `bun run typecheck`: passed.
- `bun test`: passed, 33 tests.

## Step B: Enforce terminal footer delivery

### Status

`done`

### Completed Work

- Enforced model/tool events before the terminal ad, followed by settlement and done.
- Rejected duplicate, missing, divergent, or out-of-order terminal snapshots.
- Kept all sponsorship out of assistant and tool content.
- Preserved compact Tier A/B/C footer presentation, stale-state clearing, and deduplicated savings.

### Validation Results

- Provider/security/presentation suites are included in the passing 33-test run.
- `bun run build`: passed.

## Step C: Record beta.6 candidate intent

### Status

`done_local_source`

### Completed Work

- Updated package, changelog, security, release, README, and manifest metadata to beta.6 intent.
- Set candidate-first local release policy without changing any public tag or package.
- Documented key lifecycle, 25% subsidy, endpoint isolation, model catalog, and hosted limitations.

### Validation Results

- `bun run release:policy`: passed.
- `git diff --check`: passed.
- Full `bun run release:check`: intentionally not run from the dirty, no-release working tree.

## Follow-up Work

- Commit and review Router and OpenCode inputs independently.
- Apply the Router migration and deploy the endpoint only with separate authorization.
- Run clean-tree package inspection, OpenCode compatibility checks, hosted canaries, and
  cross-platform acceptance.
- Change GitHub visibility and publish immutable beta.6 only with explicit release authorization.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-08-07 | Use a dedicated integration key and endpoint. | Prevent CLI/Desktop credential reuse and route widening. | Hosted OpenCode accepts only `adr_int_` integration keys. |
| 2026-08-07 | Keep sponsorship in terminal metadata. | Protect model, assistant, and tool context. | The plugin renders `app_bottom` after model output. |
| 2026-08-07 | Use beta.6 for local candidate intent. | Beta.5 remains held and package versions are immutable. | No public channel changed. |
