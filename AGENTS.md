# AdRouter OpenCode repository instructions

## Repository boundary

This independent repository owns `@adrouter/opencode`. Its GitHub repository is
`adrouter/adrouter-opencode`; never combine its lockfile, Git history, commits, or release state
with CLI or Desktop. Check `git status --short --branch` before work and preserve dirty/diverged
user changes.

Read `README.md`, `PLAN.md`, `SECURITY.md`, `RELEASE.md`, manifests, workflows, and executable
source before product or release changes. Volatile local/public state lives in
`../../docs/state.md` and the newest workspace parity report; re-query npm/GitHub before repeating
it here.

## Source map and toolchain

- `src/server.ts` — OpenCode provider/model registration.
- `src/provider.ts`, `src/contracts.ts`, and `src/transport/` — AI SDK provider, prompt/tool mapping,
  configuration, JSON/NDJSON parsing, and transport protections.
- `src/tui.tsx` and `src/presentation.ts` — display-only three-line bottom footer and cumulative
  savings.
- `test/`, `scripts/`, and `.github/workflows/` — provider/auth/transport/TUI/release coverage and
  candidate/promotion automation.
- `release-manifest.json` — intended release identity/channels, not evidence of publication.
- `dist/`, coverage, tarballs, isolated installs, and acceptance output are generated.

Use Bun 1.3.14 and `bun.lock`; do not add npm, pnpm, or Yarn lockfiles. Preserve OpenCode
`>=1.18.4 <2`, strict TypeScript, AI SDK provider v3, SolidJS/OpenTUI, the `adrouter` IDs, and root,
`./server`, and `./tui` exports.

## Authentication, catalog, and platform exceptions

- OpenCode uses a dedicated integration key on `POST /v1/integrations/turn`. That key is scoped only
  to the integration route and must never be accepted by `/v1/profile`, `/v1/agent/turn`, or any
  machine-installation endpoint.
- Router's machine-installation policy still rejects client kind `opencode`. Never describe current
  integration-key access as DPoP installation auth.
- The provider registers the same eight Router IDs and exact model-specific context/input/output
  tuples. Its current integration transport remains text/tool-only even when a model's browser
  descriptor permits image input.
- The integration may enforce a conservative request output default/cap without rewriting the
  underlying model catalog. Document that as a platform exception.

## Product and security invariants

- Sponsor/settlement information is display metadata only. Never put it in prompts, assistant text,
  tool definitions/results, commands, edits, or compacted context.
- Keep the width-safe, theme-aware three-line footer, deduplicated cumulative savings, and stale
  clearing for off/degraded/NONE outcomes.
- Hosted origins must use live execution. Custom remote URLs require HTTPS and HTTP is loopback-only.
  Reject credentialed URLs, authenticated redirects, protected-header overrides, oversized bodies
  or lines, idle streams, malformed events, and divergent final snapshots.
- Preserve native conversation/tool mapping while rejecting unsupported attachments, non-function
  tools, and provider-executed tool approvals. Never log/persist credentials or private response
  bodies.

## Verification and releases

Run focused non-formatting checks while a dirty user tree must be preserved:

```sh
bun run lint
bun run typecheck
bun test
bun run build
bun run release:policy
```

Formatting may rewrite user-owned files; run it only when its scope is intentional. Run the full
`bun run release:check` only from a clean exact release-input tree. Hosted canaries, acceptance
upload, release soak, tags, publication, dist-tag operations, release edits, visibility changes,
protected approvals, and remote-secret changes require explicit authorization. Versions and tags
are immutable; fix forward.
