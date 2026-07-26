# Security policy

## Supported versions

Security fixes are provided for the newest published stable and actively supported beta channels.
Before the first stable release, the newest beta is the only supported version. Published npm
versions are immutable; fixes use a new version rather than replacing an artifact.

## Reporting

Use GitHub private vulnerability reporting for
`adrouter/adrouter-opencode`. Do not open a public issue containing API keys,
prompts, private response bodies, local paths, or exploit details.

## Backend and credentials

The hosted service currently uses `https://api-staging.adrouter.co` and requires an invited
credential, including when the package reaches stable `0.1.0`. Custom remote backends must use HTTPS. HTTP is accepted only for
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
