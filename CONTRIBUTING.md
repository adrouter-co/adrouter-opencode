# Contributing

Use Bun 1.3.14 and keep `bun.lock` authoritative.

```sh
bun install --frozen-lockfile
bun run release:check
```

Run `bun run format` before submitting changes. Tests must preserve at least
90% line and 80% function coverage. Do not commit `dist/`, coverage output,
tarballs, lockfiles from other package managers, credentials, or captured
staging payloads.

Security reports belong in GitHub private vulnerability reporting, not public
issues. Changes to transport trust boundaries, sponsor/context separation,
settlement accounting, workflows, or published files require focused tests and
review.
