# AdRouter OpenCode repository instructions

## Current local candidate and repository boundary

This independent repository owns `@adrouter/opencode` and uses Bun. Its GitHub repository is
`adrouter/adrouter-opencode`; never combine its lockfile, Git history, or release state with CLI or
Desktop.

Public beta.4 remains the published version. The substantial user-owned, unreleased beta.5
installation-auth work remains parked in `stash@{0}` as `clean-slate-2026-08-02`; do not apply,
drop, rewrite, publish, or treat that snapshot as accepted.

The user explicitly lifted the source hold for the integration-endpoint roadmap on 2026-08-07.
The active working tree now carries uncommitted beta.6 candidate intent against the isolated
integration-key contract. That authorization does not include commits, pushes, tags, publication,
repository-visibility changes, hosted migrations, or deployment.

## Source map and toolchain

- `src/server.ts` — OpenCode provider/model registration.
- `src/provider.ts`, `src/contracts.ts`, and `src/transport/` — AI SDK provider, prompt/tool mapping,
  configuration, JSON/NDJSON parsing, and transport protections.
- `src/tui.tsx` and `src/presentation.ts` — display-only bottom panel and cumulative savings.
- `test/`, `scripts/`, and `.github/workflows/` — provider/auth/transport/TUI/release coverage and
  candidate/promotion automation.
- `release-manifest.json` — local beta.6 intent, not evidence of publication.
- `dist/`, coverage, tarballs, isolated installs, and acceptance output are generated.

Use Bun 1.3.14 and `bun.lock`; do not add npm, pnpm, or Yarn lockfiles. Preserve OpenCode
`>=1.18.4 <2`, strict TypeScript, AI SDK provider v3, SolidJS/OpenTUI, the `adrouter` IDs, and root,
`./server`, and `./tui` exports.

## Public versus local state

Public npm state was rechecked on 2026-08-07: only beta.2, beta.3, and beta.4 are published, so
beta.6 is unused. Public `beta`/`latest` remain outside this working tree and no publication claim
may be inferred from local package metadata.

The active beta.6 source registers all eight Router model IDs and their exact 524,288- or
1,048,576-token context windows while enforcing a conservative 4,096-token integration output
cap. The integration path remains text/tool-only even when the underlying model accepts images.

## Remaining release blockers

- The Router integration endpoint, entitlement, and migration in this workspace are local source;
  they are not evidence of hosted availability.
- The beta.6 tree is uncommitted and therefore is not an immutable or reproducible candidate.
- Public repository visibility, downloadable archives, cross-host acceptance, and hosted canaries
  were not changed or run under the no-deployment instruction.
- The complete clean-tree `release:check` remains a future release gate. Local unit, type, lint,
  build, and release-policy checks do not authorize publication.

## Product and security invariants

- Sponsor/settlement information is provider display metadata only. Never put it in prompts,
  assistant text, tool definitions/results, commands, edits, or compacted context.
- Keep the compact Tier A/B/C bottom-panel layout, deduplicated cumulative savings, and stale-state
  clearing for off/degraded/NONE outcomes.
- Hosted origins must use live execution. Custom remote URLs require HTTPS and HTTP is loopback-only.
  Reject credentialed URLs, authenticated redirects, protected-header overrides, oversized bodies
  or lines, idle streams, malformed events, and divergent final snapshots.
- Preserve native conversation/tool mapping while rejecting unsupported attachments, non-function
  tools, and provider-executed tool approvals. Never log/persist credentials or private response
  bodies.

## Verification and releases

During local source work, use focused checks first:

```sh
bun run format
bun run lint
bun run typecheck
bun test
bun run build
bun run release:policy
```

Do not run hosted canaries, acceptance upload, release soak, tag/publish commands, dist-tag
operations, or repository-visibility changes without explicit authorization. Run the full
`bun run release:check` only from a clean release-input tree when release readiness is actually in
scope. Only a clean, committed, exact candidate with Router conformance, package inspection,
cross-host acceptance, and separate release authorization may be tagged or published. Versions
and tags are immutable; fix forward. Never change protected environments or remote secrets
without explicit authorization.
