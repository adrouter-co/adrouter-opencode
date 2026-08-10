# Plan: OpenCode Beta.7 Exact-Provider Fix Forward

## Goal

Release `@adrouter/opencode@0.1.0-beta.7` as the immutable replacement for rejected beta.6, then
promote `beta`/`latest` only after an authenticated OpenCode turn passes.

## Context

- Public `beta`/`latest` remain beta.4, which uses `/v1/agent/turn` and cannot use integration keys.
- Beta.6 correctly implemented `/v1/integrations/turn`, but registered its executable provider as
  unversioned `@adrouter/opencode`; OpenCode therefore resolved public beta.4 at turn time.
- A temporary exact beta.6 provider override passed assistant, terminal-bottom, settlement, and
  usage acceptance on OpenCode 1.18.15. Public channels were not moved.
- The unrelated beta.5 installation-auth stash remains untouched.

## Constraints

- Bind the executable provider to the plugin package's own exact version.
- Preserve the dedicated `adr_int_` integration credential, staging endpoint, text/tool-only
  mapping, 4,096-token output cap, and display-only sponsor metadata.
- Never overwrite beta.6 or move `beta`/`latest` before beta.7 candidate acceptance.

## Steps

1. Add exact provider-package registration and unit/package regression coverage.
2. Add registry-backed OpenCode execution checks for the integration path and terminal metadata.
3. Validate beta.7 with Bun 1.3.14 and OpenCode 1.18.4/1.18.15.
4. Merge through protected main, tag once, stage, and publish only to `candidate`.
5. Install the exact candidate locally and require a redacted authenticated staging turn to pass.
6. Deprecate rejected beta.6, finalize beta.7 to `beta`/`latest`, and begin the 48-hour soak.

## Validation Results

- Root-cause reproduction: beta.6 default execution reached machine auth; exact beta.6 provider
  override completed assistant, terminal-bottom, settlement, and usage acceptance.
- Beta.7 lint, typecheck, 34 unit tests, build, release policy, packed-package inspection, and
  isolated OpenCode 1.18.4/1.18.15 install/discovery checks pass locally.
- Protected clean-tree checks, hosted canaries, registry execution matrix, and final channel
  verification remain release gates.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-08-08 | Reject beta.6 before channel promotion. | OpenCode executed beta.4 through the unversioned provider registration. | Beta.6 remains immutable and must be deprecated. |
| 2026-08-08 | Fix forward as beta.7 with an exact provider spec. | Plugin and provider artifacts must share one version across candidate and channel installs. | Registry acceptance now exercises a real local integration turn. |
