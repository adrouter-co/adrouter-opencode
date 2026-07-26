# Security policy

## Supported versions

Security fixes are provided for the newest published beta only. Published npm
versions are immutable; fixes are released as a new beta version.

## Reporting

Use GitHub private vulnerability reporting for
`adrouter/adrouter-opencode`. Do not open a public issue containing API keys,
prompts, private response bodies, local paths, or exploit details.

## Backend and credentials

The hosted beta uses `https://api-staging.adrouter.co` and requires an invited
credential. Custom remote backends must use HTTPS. HTTP is accepted only for
loopback development. Never put credentials in a backend URL, source file,
issue, screenshot, or log.

Authenticated requests reject redirects and ignore call-level attempts to
replace authorization, content type, or accept headers. Response limits and
timeouts fail closed and clear sponsor metadata.

## Privacy

The provider sends model conversation context and tool data needed to complete
the requested turn. Default workspace metadata is the folder name, not the
absolute path. Explicit `workspace` and `ADROUTER_WORKSPACE` values are sent as
provided. Sponsor data remains display-only provider metadata and is not added
to model context or tool data.
