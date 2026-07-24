# AdRouter Provider and Tiered-Ad Plugin for OpenCode

Version 0.1.0 implementation record.

## Completed scope

- [x] Publishable ESM package with root, server, and TUI entrypoints.
- [x] AI SDK `LanguageModelV3` implementation with `doStream` and `doGenerate`.
- [x] Native `/v1/agent/turn` JSON and streaming NDJSON contracts.
- [x] Prompt, reasoning, tools, usage, ads, injection, settlement, and terminal
  `done` reconciliation.
- [x] OpenCode provider/model registration and API-key auth hook.
- [x] Plugin-only Tier A/B/C/NONE bottom panel and cumulative savings.
- [x] Deterministic provider, prompt, registration, and presentation tests.
- [x] Build, package dry-run, tarball, and isolated install verification.

## Preserved constraints

- No OpenCode or AdRouter backend changes.
- No imports from private AdRouterCLI modules.
- No sponsor data in model context or assistant text.
- `ADROUTER_AD_MODE=off` always wins.
- No npm publication or production credential changes.

## Deferred

- Exact Tier A transcript placement, pending a public after-message slot.
- Runtime `/ads` commands.
- Future server-defined inline injection protocols.
- Hosted staging and npm publication automation.

## Validation results

- `bun run typecheck`: passed.
- `bun test`: 16 passed, 0 failed.
- `bun run build`: passed with ESM JavaScript, declarations, and source maps.
- Root/server/TUI entrypoint imports: passed.
- `npm pack --dry-run`: 40 intended entries; no source, tests, fixtures, or
  reference repositories included.
- Final tarball: `adrouter-opencode-0.1.0.tgz`, SHA-1
  `bbbfc9758fc3492d7402ac28f0a7ce9aaa3a448d`.
- Isolated tarball install with OpenCode plugin 1.18.4 and OpenTUI 0.4.5:
  passed.
- Real `router/backend` demo-mode smoke: complete assistant output, final
  versioned metadata, settlement/usage, and visible Tier C outcome.

The locally installed OpenCode CLI is 1.17.6, below this package's compatibility
floor, so it was not used as evidence for the 1.18.4 host test. The pinned
1.18.4 plugin declarations and isolated host dependency install were used
instead.
