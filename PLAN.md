# Plan: OpenCode Security-Only Beta.10 Candidate

## Goal

Publish the validated OpenCode provider/transport security fixes as immutable
`0.1.0-beta.10` GitHub and npm candidate artifacts, preserve unrelated local work, keep public
`beta`/`latest` unchanged, and leave the canonical checkout clean.

## Context

- Public beta.9 is immutable and remains the accepted `beta`/`latest` release.
- Local `main` is ahead two/behind four and has provider/transport security changes mixed with
  pre-existing README, presentation, and TUI changes.
- The security scope pins the executable provider package to the exact plugin version and bounds
  response-header/stream processing without changing integration-key or model/tool contracts.
- The completed beta.7 plan remains archived at
  [`docs/history/2026-08-10/beta7-release-plan.md`](docs/history/2026-08-10/beta7-release-plan.md).

## Research Summary

- GitHub protected environments delay release jobs until their configured reviewers/protection
  rules pass and keep environment secrets unavailable before approval.
- npm trusted publishing uses a workflow-specific GitHub OIDC identity and automatically emits
  package provenance for eligible public packages.
- Repository policy requires a protected-main PR, one immutable annotated tag, one workflow-built
  tarball, GitHub draft verification, then npm publication under only `candidate`.

## Constraints

- Preserve existing user-facing behavior except for the validated security hardening.
- Keep the implementation small, reviewable, reversible, and dependency-neutral.
- Preserve integration-key auth on `/v1/integrations/turn`, all model/tool contracts, footer privacy,
  and exact provider/plugin version identity.
- Never publish from a dirty tree, rebuild staged artifacts, reuse a version/tag, or move
  `beta`/`latest` during candidate publication.
- Preserve all unrelated local work and do not read or expose credentials.

## Out of Scope

- TUI/footer redesign, README refreshes unrelated to beta.10 security behavior, model expansion,
  Router changes, integration entitlement changes, stable publication, and final channel promotion.
- Authenticated hosted candidate acceptance and finalization; those remain later explicit gates.

## Reversibility

- Preserve the aggregate local work on a named local-only branch before extraction.
- Base the candidate on current `origin/main` and keep security/release commits independently
  reviewable.
- Prior tags, releases, npm versions, and public channels remain untouched; defects fix forward.

---

## Step A: Preserve and extract the security delta

### Status

`in_progress`

### Objective

Protect every existing local byte, integrate current remote history, and create a clean branch that
contains only the provider-version and bounded-transport fixes.

### Tasks

- [ ] Scan the current diff for secrets and record its exact status/diff identity.
- [ ] Commit the complete current worktree on a clearly named local-only preservation branch.
- [ ] Fetch current remote state and create `codex/security-beta10` from `origin/main`.
- [ ] Port only the validated changes in `src/server.ts`, provider/transport parsing, and focused
      security tests; exclude README/presentation/TUI work unless required by the security contract.
- [ ] Review the extracted diff and confirm all preserved work remains recoverable.

### Relevant Files

- `src/server.ts`, `src/provider.ts`, `src/transport/parse.ts`
- `test/provider/security.test.ts`, `test/server.test.ts`
- `README.md`, `src/presentation.ts`, `src/tui.tsx`, `test/tui/presentation.test.ts`

### Expected Changes

- create: local-only preservation branch and clean security branch
- modify: security provider/transport source and focused tests only
- delete: no local work or public state

### Do Not Modify

- sponsor/footer presentation, model catalog, auth key scope, or unrelated README content
- ignored credentials, generated `dist/`, prior tags, releases, or npm channels

### Commands

```bash
bun run lint
bun run typecheck
bun test
bun run build
bun run release:policy
git diff --check
```

### Acceptance Criteria

- [ ] The preservation branch contains the complete original dirty tree.
- [ ] The security branch is based on current `origin/main` and contains no unrelated TUI work.
- [ ] Provider identity cannot be overridden and response handling remains bounded/fail-closed.
- [ ] Focused and non-formatting checks pass.

### Validation Results

- Security extraction and checks: not run.

### Findings / Notes

- Formatting is deferred until the clean candidate branch exists because it may rewrite user files.

---

## Step B: Prepare and verify beta.10

### Status

`todo`

### Objective

Prepare unused beta.10 metadata and prove the exact candidate is releasable across the repository's
complete Bun/OpenCode package gate.

### Tasks

- [ ] Update package, manifest, changelog, security/public release notes, and workflow defaults to
      unused `0.1.0-beta.10`, superseding beta.9 without moving public channels yet.
- [ ] Run formatting only on the clean scoped branch, then run the full release gate.
- [ ] Inspect package contents, exact provider version binding, diff, and status.

### Relevant Files

- `package.json`, `release-manifest.json`, `CHANGELOG.md`, release documentation
- `.github/workflows/`, `scripts/`, `bun.lock`

### Expected Changes

- modify: required version/release metadata and beta.10 notes
- delete: no runtime behavior outside the security fixes

### Do Not Modify

- `bun.lock` unless the frozen release workflow proves a version-only lock update is required
- npm `beta`/`latest`, prior versions, tags, releases, or hosted integration secrets

### Commands

```bash
bun install --frozen-lockfile
bun run format
bun run release:check
git diff --check
git status --short --branch
```

### Acceptance Criteria

- [ ] Package and manifest identify unused beta.10 and policy validation passes.
- [ ] Root/server/TUI package targets bind to the same exact version.
- [ ] Full release checks pass from a clean exact candidate tree.
- [ ] The final diff contains only security and release-preparation changes.

### Validation Results

- Full release gate: not run.

### Findings / Notes

- Candidate publication uses GitHub Actions OIDC; no registry credential belongs in local commands.

---

## Step C: Final verification and cleanup

### Status

`todo`

### Objective

Merge through protected main, create and publish one immutable beta.10 candidate, verify public
identity, and leave the checkout clean.

### Tasks

- [ ] Push the branch, open the release PR, and merge only after Linux/macOS/Windows CI and secret
      scanning pass.
- [ ] Tag the exact protected-main merge commit as annotated `v0.1.0-beta.10` and verify the tag.
- [ ] Approve the protected staging release job, verify the draft asset inventory/integrity, and
      dispatch `publish-candidate`.
- [ ] Approve `npm-publish`, verify npm provenance/integrity and anonymous package imports, and
      confirm `beta`/`latest` remain beta.9.
- [ ] Record exact commits, tag, workflow/release URLs, npm state, preservation branch, and remaining
      acceptance/finalization gates.
- [ ] Confirm `git status --short --branch` is clean.

### Relevant Files

- `.github/workflows/release.yml`, `.github/workflows/publish.yml`
- `RELEASE.md`, `PLAN.md`, `../../docs/state.md`

### Expected Changes

- create: protected PR/merge, annotated beta.10 tag, GitHub candidate, npm candidate
- modify: this plan and workspace release-state record
- delete: no prior immutable state; temporary candidate cleanup is deferred until finalization

### Do Not Modify

- npm `beta`/`latest`, beta.9 assets/tags, hosted Router data, or integration secrets

### Commands

```bash
git status --short --branch
npm view @adrouter/opencode dist-tags --json
npm view @adrouter/opencode@0.1.0-beta.10 dist.integrity dist.attestations --json
gh release view v0.1.0-beta.10 --repo adrouter/adrouter-opencode --json isDraft,isPrerelease,url,assets,tagName
```

### Acceptance Criteria

- [ ] One exact commit owns the annotated tag, GitHub assets, npm integrity, and provenance.
- [ ] npm `candidate` resolves to beta.10 while `beta`/`latest` remain beta.9.
- [ ] Unrelated work remains recoverable and was not pushed in the release branch.
- [ ] The canonical directory is clean.

### Validation Results

- Protected CI, candidate workflows, and public verification: not run.

### Findings / Notes

- Hosted authenticated acceptance and final channel promotion require a later explicit operation.

---

## Follow-up Work

- Complete an exact npm-candidate OpenCode hosted turn and cross-platform acceptance before any
  finalization.
- Remove the retained beta.9 `candidate` exception only through the reviewed publication workflow.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-08-11 | Use beta.10 and preserve the mixed local tree on a local-only branch. | Beta.9 is immutable and the aggregate worktree contains unrelated presentation work. | Security publication remains narrow, reproducible, and reversible. |
