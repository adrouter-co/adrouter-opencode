# AdRouter OpenCode repository instructions

## Current hold and repository boundary

This independent repository owns `@adrouter/opencode` and uses Bun. Its GitHub repository is
`adrouter/adrouter-opencode`; never combine its lockfile, Git history, or release state with CLI or
Desktop.

OpenCode is intentionally held and non-blocking for the current Router/CLI/Desktop rollout. Public
beta.4 remains the published version. The substantial user-owned, unreleased beta.5
installation-auth work is parked in the named `clean-slate-2026-08-02` Git stash so the active
checkout can remain clean. Do not apply, drop, rewrite, publish, or treat that beta.5 snapshot as
accepted unless the user explicitly lifts the hold.

The user's request to maintain this `AGENTS.md` is the only instruction-file exception; it does not
authorize changes to source, tests, fixtures, schemas, manifests, workflows, lockfile, release
prose, generated output, or remote state.

## Source map and toolchain

- `src/server.ts` — OpenCode provider/model registration.
- `src/provider.ts`, `src/contracts.ts`, and `src/transport/` — AI SDK provider, prompt/tool mapping,
  configuration, JSON/NDJSON parsing, and transport protections.
- `src/auth/`, `src/auth-cli.ts`, fixtures, and schemas — unreleased installation enrollment,
  storage, proof, refresh, disconnect, and acceptance work.
- `src/tui.tsx` and `src/presentation.ts` — display-only bottom panel and cumulative savings.
- `test/`, `scripts/`, and `.github/workflows/` — provider/auth/transport/TUI/release coverage and
  candidate/promotion automation.
- `release-manifest.json` — local beta.5 intent, not evidence of publication.
- `dist/`, coverage, tarballs, isolated installs, and acceptance output are generated.

Use Bun 1.3.14 and `bun.lock`; do not add npm, pnpm, or Yarn lockfiles. Preserve OpenCode
`>=1.18.4 <2`, strict TypeScript, AI SDK provider v3, SolidJS/OpenTUI, the `adrouter` IDs, and root,
`./server`, and `./tui` exports.

## Public versus local state

Remote state was verified on 2026-08-01: npm `beta`/`latest` and the published GitHub prerelease are
`0.1.0-beta.4`; no npm `candidate` exists. The active package manifest is beta.4, based on the
immutable beta.4 release plus this documentation commit. The stashed beta.5 snapshot is held,
incompatible with current hosted policy, untested as a release, and unpublished.

The active beta.4 plugin and stashed beta.5 snapshot expose only `deepseek-v4-flash` and
`deepseek-v4-pro` with a declared 1,000,000-token context. Current Router has six models and a
131,072-token hosted context. Reconcile catalog, reasoning modes, and limits from then-current
Router source if the hold is lifted; do not silently represent the old declaration as the hosted
contract.

## Known resume blockers

- Router currently rejects the `opencode` hosted client with `client_not_allowed`; source support
  for the enum/schema is not activation.
- Local fixture SHA-256 `4a12241eda5d67d803ecb597391a31154af5b11824456a3c458a9390124f53ee`
  differs from the current Router/CLI/Agent canonical fixture
  `93a8ec8d4eba38f9165179aa0cdfe3316f8134a882bd0426bd83339af55d17f8`.
- Enrollment/refresh paths use `error` as a machine code in places, while Router's envelope is
  `{ error: <safe display message>, code: <machine code> }`.
- The provider catalog/limits lag the current six-model hosted registry.

If the user lifts the hold, first re-read Router/OpenAPI/auth fixtures and current CLI/Desktop
contracts; these exact facts may have advanced. Repair compatibility with Router-derived positive
and negative tests, then select a remotely unused beta. Never add OpenCode back to rollout gates
solely because its local tests pass.

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

While the hold is active, do not run `bun install`, `bun run release:check`, hosted canaries,
acceptance upload, release soak, tag/publish commands, or dist-tag operations. Source/release tests
are intentionally not a current completion gate.

After an explicit lift and compatibility repair, use focused `bun test` targets, then:

```sh
bun install --frozen-lockfile
bun run release:check
```

Only a clean, committed, exact candidate with Router conformance, package inspection, cross-host
acceptance, and separate release authorization may be tagged/published. Versions and tags are
immutable; fix forward. Never change protected environments or remote secrets without explicit
authorization.
