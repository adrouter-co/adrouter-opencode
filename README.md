# @adrouter/opencode

AdRouter provider and tiered sponsorship panel for OpenCode 1.18.4 and later.

The package adds:

- `adrouter/deepseek-v4-flash` and `adrouter/deepseek-v4-pro`
- AI SDK v3 JSON and NDJSON transport for `/v1/agent/turn`
- reasoning, tool-call, usage, injection, settlement, and ad metadata support
- a plugin-only `app_bottom` panel for Tier A, B, C, and NONE outcomes
- Tier A settlement detail and per-session cumulative savings

Sponsor data remains provider metadata. It is never inserted into prompts, model
messages, tool inputs, tool results, or assistant response text.

## Install

```sh
opencode plugin @adrouter/opencode
```

OpenCode detects both package targets:

- `@adrouter/opencode/server` configures the provider and authentication.
- `@adrouter/opencode/tui` renders the terminal panel.

The package supports OpenCode `>=1.18.4 <2`.

## Authenticate

Store a key in OpenCode's normal credential store:

```sh
opencode auth login --provider adrouter
```

Or configure an environment key:

```sh
export ADROUTER_API_KEY="your-key"
```

Credential precedence is an OpenCode-injected `apiKey` option followed by
`ADROUTER_API_KEY`. Authentication is validated by the first provider request.

## Select a model

Select either model from OpenCode's provider/model picker:

```text
adrouter/deepseek-v4-flash
adrouter/deepseek-v4-pro
```

Both expose `none`, `medium`, and `high` reasoning variants, function tools, a
1,000,000-token context limit, and a 4,096-token output limit. Attachments are
intentionally unsupported.

## Hosted configuration

The default endpoint is:

```text
https://api-staging.adrouter.co
```

Official hosted endpoints always use live execution. A hosted endpoint rejects
`ADROUTER_RUNTIME_MODE=mock`.

## Local backend

Point the provider at a local AdRouter backend:

```sh
export ADROUTER_API_KEY="local-smoke"
export ADROUTER_API_URL="http://127.0.0.1:8787"
export ADROUTER_RUNTIME_MODE="mock"
opencode
```

Custom and local URLs default to mock mode. They may explicitly use `mock` or
`live`.

## Configuration

The provider factory accepts:

```ts
import { createAdRouter } from "@adrouter/opencode"

const adrouter = createAdRouter({
  apiKey: "local-smoke",
  baseURL: "http://127.0.0.1:8787",
  runtimeMode: "mock",
  adsEnabled: true,
  minimumTier: "3",
  workspace: process.cwd(),
  defaultMaxOutputTokens: 4096,
})
```

Environment variables take precedence where shown:

| Setting | Precedence and default |
| --- | --- |
| API key | provider `apiKey`, then `ADROUTER_API_KEY` |
| API URL | `ADROUTER_API_URL`, provider `baseURL`, staging URL |
| routed model | `ADROUTER_MODEL_ROUTE`, provider model override, requested model |
| workspace | `ADROUTER_WORKSPACE`, provider workspace, current directory |
| runtime mode | `ADROUTER_RUNTIME_MODE`, provider runtime mode, hosted/live or custom/mock |
| minimum tier | `ADROUTER_MIN_AD_TIER`, provider minimum tier, `"3"` |
| ad mode | `ADROUTER_AD_MODE`, provider ad mode, hosted/live or custom/mock |
| ads enabled | `ADROUTER_ADS_ENABLED`, provider option, `true` |

`ADROUTER_AD_MODE=off` is a non-overridable safety switch.
`ADROUTER_ADS_ENABLED=false` and `adsEnabled: false` also disable sponsorship.

Per-call output limits are clamped to 4,096 tokens.

## Panel behavior

- Tier A shows a compact line during generation and an expanded settlement card
  afterward.
- Tier B and C show the compact line.
- Tier NONE remains visible for privacy and guardrail outcomes.
- opt-out, degraded, no-inventory, and routing-failure outcomes clear any prior
  sponsor immediately.
- cumulative savings persist for the current session and are deduplicated by
  AdRouter turn ID.

OpenCode currently exposes `app_bottom` but no after-message transcript slot.
Tier A detail therefore remains in the bottom panel until the next user turn.
No OpenCode patch is required.

## Troubleshooting

- `401` or an authentication message: set `ADROUTER_API_KEY` or run
  `opencode auth login --provider adrouter`.
- `invalid_model`: select one of the registered AdRouter model IDs or check
  `ADROUTER_MODEL_ROUTE`.
- `409` / live provider not configured: configure the upstream provider on the
  backend, or use a local backend with `ADROUTER_RUNTIME_MODE=mock`.
- `hosted_mock_not_allowed`: remove mock mode for hosted AdRouter URLs.
- `routing_failure` or `no_inventory`: the provider response continues without
  a stale sponsor and the panel clears.
- malformed or divergent NDJSON: the turn ends with a sanitized protocol error;
  previously streamed output is never silently rewritten.

## Development

```sh
bun install
bun run typecheck
bun test
bun run build
npm pack --dry-run
npm pack
```

The npm package contains only built output, this README, the changelog, license,
and required npm metadata.
