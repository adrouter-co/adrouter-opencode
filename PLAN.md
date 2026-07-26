# Plan: Uniform-footer beta.4 and stable 0.1.0 release

## Goal

Publish `@adrouter/opencode@0.1.0-beta.4`, validate it through the protected candidate and
cross-platform release process, soak the accepted beta for 48 hours, and then publish a
runtime-identical `0.1.0` stable release. Tier A, B, and C sponsorships must share the same compact
OpenCode `app_bottom` presentation while cumulative session savings remain visible.

## Context

- The canonical repository is `adrouter/adrouter-opencode`; release work must use a clean clone and
  protected `main`, not the dirty consolidation workspace.
- Public npm and GitHub state was verified on 2026-07-26 at `0.1.0-beta.3`; `beta` and `latest`
  resolve to beta.3 and no `candidate` tag remains.
- The existing TUI renders all tiers compactly, then adds a second expanded card for settled Tier A.
  This release removes only that expanded Tier A presentation.
- The earlier inline-assistant proposal in `INLINE_ADS_SPEC.md` is superseded. OpenCode does not
  currently expose a native assistant-message footer slot, and sponsor data must remain outside
  assistant/model/tool content.
- The package continues to default to the invite-only staging service at
  `https://api-staging.adrouter.co`, including for stable `0.1.0`.
- The user handles interactive authentication, protected-environment approvals, npm trusted
  publisher setup, and short-lived token revocation. Credentials must never appear in chat, source,
  commands, or logs.

## Research Summary

- Current source confirms `src/tui.tsx` adds `tierACard` after settled Tier A responses while
  `renderCompactAd` already supports A, B, C, and NONE uniformly.
- Current OpenCode plugin types (`1.18.4`), npm release `1.18.5`, and upstream development sources
  do not expose the proposed `session_message_footer` slot.
- Sister AdRouter release projects require a 48-hour clean soak, real macOS/Linux/Windows evidence,
  and a metadata-only stable diff; those gates are adopted here.
- Candidate-first npm publication, exact recorded artifacts, OIDC provenance, anonymous registry
  installation, and protected promotion remain the release safety model.

## Constraints

- Preserve sponsor metadata as display/accounting data only; never add it to prompts, assistant
  text, tools, commands, edits, or compacted context.
- Preserve the `adrouter` plugin/provider/auth IDs and all root, `./server`, and `./tui` exports.
- Preserve public provider types, request/response contracts, transport protections, and settlement
  accounting.
- Keep changes small, reviewable, reversible, and dependency-free.
- Use Bun 1.3.14 and the authoritative `bun.lock`; do not add another package manager.
- Never overwrite, reuse, move, or unpublish package versions or Git tags.
- Any runtime change after beta.4 finalization requires the next unused beta and restarts the soak.

## Out of Scope

- Inline assistant-message sponsorship or upstream OpenCode API changes.
- Server/API/schema changes or migration from staging to a production backend.
- Unrelated UI redesign, module renames, dependency upgrades, or opportunistic cleanup.
- Changes to sponsor selection, subsidy percentages, model routing, or authentication contracts.

## Reversibility

- Keep the TUI change isolated from provider and transport behavior and cover it with focused tests.
- Preserve immutable release artifacts; fix an unusable beta forward with beta.5 or later.
- Before stable publication, rollback means keeping `latest` on beta.4. After an invalid stable
  release, move `latest` back to beta.4, deprecate the invalid stable version, and fix forward
  through a new prerelease/stable series.
- Align implementation, beta release, and stable metadata changes with separate reviewable commits
  and pull requests.

---

## Step A: Implement the uniform sponsorship footer

### Status

`done`

### Objective

Render Tier A, B, and C exactly once using the compact footer while preserving cumulative savings
and all privacy/state invariants.

### Tasks

- [x] Remove the settled Tier A expanded-card branch from the TUI.
- [x] Remove the now-unused Tier A card helper and background palette values.
- [x] Update focused presentation/TUI tests for identical A/B/C layout and retained session savings.
- [x] Verify NONE, off, degraded, stale-state clearing, reconstruction, truncation, and sanitization.

### Relevant Files

- `src/tui.tsx`
- `src/presentation.ts`
- `test/tui/presentation.test.ts`

### Expected Changes

- modify: `src/tui.tsx`
- modify: `src/presentation.ts`
- modify: focused tests under `test/`

### Do Not Modify

- Provider metadata contracts or `/v1/agent/turn` payloads
- Root, `./server`, and `./tui` public exports
- Sponsor privacy and transport-safety behavior

### Commands

```bash
bun test test/tui/presentation.test.ts
bun run typecheck
```

### Acceptance Criteria

- [x] Tier A/B/C use one identical compact layout in routed, streaming, settled, and done phases.
- [x] No expanded Tier A card or per-turn card savings line remains.
- [x] Deduplicated cumulative session savings remain visible.
- [x] Focused tests and typechecking pass without unrelated changes.

### Validation Results

- `bun test test/tui/presentation.test.ts`: passed, 4 tests and 21 assertions
- `bun run typecheck`: passed

### Findings / Notes

- `renderCompactAd` is the retained renderer for every sponsorship tier.
- The complete suite retains coverage for privacy clearing, transport isolation, and savings
  deduplication.

---

## Step B: Generalize release policy and prepare beta.4

### Status

`done`

### Objective

Make protected release automation support both prerelease and first-stable channel policies, then
prepare immutable beta.4 metadata and documentation.

### Tasks

- [x] Upgrade the release manifest and validators to distinguish beta and stable policies.
- [x] Make GitHub prerelease state, deprecation, final tags, and workflow wording manifest-driven.
- [x] Add a stable-readiness guard for a 48-hour soak, three OS evidence URLs, and metadata-only diff.
- [x] Add a protected, non-mutating soak workflow for public package and live-canary evidence.
- [x] Set package/manifest/changelog documentation to `0.1.0-beta.4`, superseding beta.3.
- [x] Document `@beta`, `@latest`, staging-service status, release recovery, and authentication gates.

### Relevant Files

- `release-manifest.json`
- `scripts/`
- `.github/workflows/`
- `package.json`, `CHANGELOG.md`, `README.md`, `SECURITY.md`, `RELEASE.md`

### Expected Changes

- modify: release manifest, validation/release scripts, protected workflows, package metadata, and
  public release documentation
- create: stable-readiness validation script only if it cannot be kept within an existing validator

### Do Not Modify

- `publishConfig.tag` (`candidate`)
- Pinned action SHAs, provenance checks, artifact allowlists, or secret/privacy scans
- Supported OpenCode range or the 1.18.4/1.18.5 release matrix

### Commands

```bash
bun install --frozen-lockfile
bun run format
bun run release:check
git diff --check
```

### Acceptance Criteria

- [x] Beta.4 maps both `beta` and `latest` to `0.1.0-beta.4` and deprecates beta.3 only after gates.
- [x] Stable policy maps only `latest` to `0.1.0`, preserves `beta` on beta.4, and makes deprecation optional.
- [x] Stable readiness rejects an early soak, missing OS evidence, or runtime differences.
- [x] Full local release checks pass on a clean working tree except intended changes.

### Validation Results

- `bun install --frozen-lockfile`: passed with Bun 1.3.14 and no lockfile changes
- `bun run format`: passed
- `bun run release:check`: passed; 32 tests, 96.24% lines, 94.45% functions, package checks,
  audits, and real OpenCode 1.18.4/1.18.5 model/auth discovery
- `git diff --check`: passed

### Findings / Notes

- Stable metadata may change package/release versions, manifest soak evidence, changelog, README,
  security/release documentation, and plan status; runtime source, tests, scripts, and workflows
  must match the accepted beta.4 tree.
- All five GitHub workflow files parse successfully as YAML.

---

## Step C: Publish and soak beta.4

### Status

`blocked`

### Objective

Release the exact protected-main beta.4 artifact through candidate verification and collect clean
stable-readiness evidence.

### Tasks

- [ ] Merge the release PR only after all required checks pass.
- [ ] Create and push annotated `v0.1.0-beta.4` on the exact merge commit.
- [ ] Approve staging canaries and inspect the draft release's exact three assets.
- [ ] Publish with OIDC under `candidate`, run registry checks, then finalize npm/GitHub promotion.
- [ ] Verify public metadata, provenance, assets, plugin models, and auth discovery anonymously.
- [ ] Delete the temporary GitHub npm secret and have the user revoke its registry token.
- [ ] Complete and record a 48-hour clean soak with macOS/Linux/Windows and interactive TUI evidence.

### Relevant Files

- `release-manifest.json`
- `.github/workflows/release.yml`
- `.github/workflows/publish.yml`
- `.github/workflows/soak.yml`
- `RELEASE.md`

### Expected Changes

- external: protected PR merge, immutable tag, npm package/dist-tags/deprecation, GitHub prerelease
- modify: `PLAN.md` validation results and evidence after successful gates

### Do Not Modify

- Previously published npm versions or Git tags
- Recorded release tarball after the draft is created
- `latest` or `beta` before candidate checks pass

### Commands

```bash
gh workflow run publish.yml --repo adrouter/adrouter-opencode --ref main -f tag=v0.1.0-beta.4 -f phase=publish-candidate
gh workflow run publish.yml --repo adrouter/adrouter-opencode --ref main -f tag=v0.1.0-beta.4 -f phase=finalize-release
npm view @adrouter/opencode dist-tags --json
gh release view v0.1.0-beta.4 --repo adrouter/adrouter-opencode
```

### Acceptance Criteria

- [ ] `candidate` is absent and `beta`/`latest` resolve to beta.4.
- [ ] beta.3 is deprecated and GitHub beta.4 is a published prerelease with exact assets.
- [ ] Anonymous Linux/macOS/Windows checks pass for both supported OpenCode versions.
- [ ] Both hosted canaries and an interactive uniform-footer TUI check remain green for 48 hours.

### Validation Results

- Protected beta workflows: not run
- Public npm/GitHub verification: not run
- 48-hour soak: not started

### Findings / Notes

- User action is required only for interactive login, protected environment approval, secret setup,
  and npm token revocation.
- `gh auth status` currently reports an invalid token for `HappyCool121`; branch publication cannot
  start until `gh auth login -h github.com -p https -w` succeeds.

---

## Step D: Promote runtime-identical stable 0.1.0

### Status

`todo`

### Objective

Publish the first stable version without changing the beta.4 runtime or the moving beta channel.

### Tasks

- [ ] Open and merge a metadata-only stable PR containing authenticated soak evidence.
- [ ] Set `version=0.1.0`, `latest=0.1.0`, `beta=0.1.0-beta.4`, no supersedes, and non-prerelease GitHub state.
- [ ] Pass the stable-diff guard and complete release checks.
- [ ] Tag `v0.1.0`, publish candidate, pass the full registry matrix, and finalize stable.
- [ ] Verify stable and beta independently, then delete/revoke the separate stable npm token.

### Relevant Files

- `package.json`
- `release-manifest.json`
- `CHANGELOG.md`, `README.md`, `SECURITY.md`, `RELEASE.md`, `PLAN.md`

### Expected Changes

- modify: stable release metadata and documentation only
- external: protected PR merge, immutable stable tag, npm package/dist-tags, GitHub stable release

### Do Not Modify

- Runtime source, tests, validation scripts, workflows, or dependencies accepted in beta.4
- npm `beta` channel target
- Default staging backend URL

### Commands

```bash
bun run release:check
gh workflow run publish.yml --repo adrouter/adrouter-opencode --ref main -f tag=v0.1.0 -f phase=publish-candidate
gh workflow run publish.yml --repo adrouter/adrouter-opencode --ref main -f tag=v0.1.0 -f phase=finalize-release
npm view @adrouter/opencode dist-tags --json
gh release view v0.1.0 --repo adrouter/adrouter-opencode
```

### Acceptance Criteria

- [ ] Stable differs from accepted beta.4 only in the documented metadata allowlist.
- [ ] `latest=0.1.0`, `beta=0.1.0-beta.4`, and no `candidate` remains.
- [ ] GitHub `v0.1.0` is a published non-prerelease with exact recorded assets.
- [ ] Anonymous `@latest` and `@beta` installs expose both models and the AdRouter auth method.

### Validation Results

- Stable diff and release checks: not run
- Protected stable workflows: not run
- Public npm/GitHub verification: not run

### Findings / Notes

- Stable continues to default to the invite-only staging service by explicit product decision.

---

## Step E: Final verification and cleanup

### Status

`todo`

### Objective

Confirm the final public state, remove temporary release credentials, and record any remaining risks.

### Tasks

- [ ] Run the full validation suite and review the final diff for unintended changes.
- [ ] Confirm npm integrity/provenance, GitHub assets, tags, commits, package imports, models, and auth discovery.
- [ ] Remove temporary debugging output, generated artifacts, unused code, and stale release wording.
- [ ] Delete the `npm-publish` `NPM_TOKEN` secret and confirm user-side registry revocation.
- [ ] Record final validation results, remaining risks, and follow-up work in this plan.

### Relevant Files

- `PLAN.md`
- `release-manifest.json`
- Public npm and GitHub release state

### Expected Changes

- modify: `PLAN.md` final statuses, evidence, findings, and follow-up work
- external: temporary release-secret cleanup

### Do Not Modify

- Published immutable versions, Git tags, or recorded release artifacts
- Unrelated repositories in the consolidation workspace

### Commands

```bash
bun run release:check
git diff --check
npm view @adrouter/opencode@0.1.0 dist.integrity dist.attestations --json
gh release view v0.1.0 --repo adrouter/adrouter-opencode --json isDraft,isPrerelease,url,assets,tagName
```

### Acceptance Criteria

- [ ] All local and protected release checks pass and evidence is recorded.
- [ ] Final public npm and GitHub state matches the release manifest exactly.
- [ ] No temporary npm token remains in GitHub and the user confirms npm-side revocation.
- [ ] No unintended files, secrets, generated artifacts, or stale comments remain.

### Validation Results

- `bun run release:check`: not run
- `git diff --check`: not run
- Final public verification: not run

### Findings / Notes

- None yet.

---

## Follow-up Work

- Move the stable package default from staging to production only through a separately approved,
  tested release after the production service is ready.
- Revisit native inline placement only if OpenCode publishes a supported display-only slot that
  preserves the sponsor privacy boundary.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-07-26 | Release beta.4 before stable 0.1.0 | Exercise the runtime and release-policy changes through the full prerelease gate | Stable requires a clean 48-hour beta soak |
| 2026-07-26 | Use one compact footer for Tier A/B/C | OpenCode lacks a native assistant footer and duplicate Tier A presentation is unnecessary | Expanded Tier A card and per-turn card savings are removed |
| 2026-07-26 | Retain cumulative session savings | The aggregate remains useful without making tiers visually inconsistent | Savings stay deduplicated by `turn_id` |
| 2026-07-26 | Keep the staging backend default in stable | Production API migration is not part of this release | Stable package remains invite-only in service availability |
| 2026-07-26 | Follow sister-project stable gates | Adopts an already-reviewed release standard | Requires 48 hours, three OS evidence, and a metadata-only stable diff |
