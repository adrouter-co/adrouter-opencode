import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertReleasePolicy,
  type ReleasePolicyManifest,
  releasePolicyFailures,
  stableDiffFailures,
  stableRepositoryFailures,
} from "../../scripts/release-policy.js";

const packageJson = {
  name: "@adrouter/opencode",
  version: "0.1.0-beta.6",
  publishConfig: { tag: "candidate" },
};

function betaManifest(): ReleasePolicyManifest {
  return {
    schema: 2,
    version: "0.1.0-beta.6",
    release: {
      candidateTag: "candidate",
      finalTags: { beta: "0.1.0-beta.6", latest: "0.1.0-beta.6" },
      githubPrerelease: true,
      supersedes: "0.1.0-beta.4",
    },
    npm: { package: "@adrouter/opencode", opencodeVersions: ["1.18.4", "1.18.5"] },
  };
}

function stableManifest(): ReleasePolicyManifest {
  return {
    ...betaManifest(),
    version: "0.1.0",
    release: {
      candidateTag: "candidate",
      finalTags: { beta: "0.1.0-beta.6", latest: "0.1.0" },
      githubPrerelease: false,
      soak: {
        betaVersion: "0.1.0-beta.6",
        startedAt: "2026-07-26T23:59:59.000Z",
        cohortEvidence: {
          darwin: "https://github.com/adrouter/adrouter-opencode/actions/runs/1",
          linux: "https://github.com/adrouter/adrouter-opencode/actions/runs/2",
          windows: "https://github.com/adrouter/adrouter-opencode/actions/runs/3",
        },
      },
    },
  };
}

function git(cwd: string, ...args: string[]): void {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
}

describe("release policy", () => {
  test("accepts the beta.6 channel policy", () => {
    expect(releasePolicyFailures(betaManifest(), packageJson)).toEqual([]);
  });

  test("accepts a soaked stable release that preserves beta", () => {
    const now = Date.parse("2026-07-29T00:00:00.000Z");
    const manifest = stableManifest();
    expect(releasePolicyFailures(manifest, { ...packageJson, version: "0.1.0" }, now)).toEqual([]);
  });

  test("reports malformed beta metadata together", () => {
    const manifest = betaManifest();
    manifest.schema = 1;
    manifest.version = "0.1.0-beta.6+invalid";
    manifest.release.candidateTag = "latest";
    manifest.release.finalTags = { next: "0.1.0-beta.6" };
    manifest.release.githubPrerelease = true;
    manifest.release.supersedes = "0.1.0-beta.6+invalid";
    manifest.release.soak = {};
    manifest.npm.package = "other";
    manifest.npm.opencodeVersions = ["1.18", "1.18"];
    const failures = releasePolicyFailures(manifest, packageJson);
    expect(failures).toContain("Release manifest schema must be 2.");
    expect(failures).toContain("Release version must be stable or a numbered beta.");
    expect(failures).toContain("Package and release versions differ.");
    expect(failures).toContain("Release package name differs.");
    expect(failures).toContain("Candidate tag must be candidate.");
    expect(failures).toContain("Package publication tag must match the release candidate tag.");
    expect(failures).toContain("Final tags must contain exactly beta and latest.");
    expect(failures).toContain("Latest must target the release version.");
    expect(failures).toContain("GitHub prerelease state must match the release version channel.");
    expect(failures).toContain("OpenCode release matrix must contain unique exact versions.");
  });

  test("reports beta and stable channel-specific mismatches", () => {
    const beta = betaManifest();
    beta.release.finalTags.beta = "0.1.0-beta.3";
    beta.release.supersedes = beta.version;
    beta.release.soak = {};
    const betaFailures = releasePolicyFailures(beta, packageJson);
    expect(betaFailures).toContain(
      "Beta releases must promote both beta and latest to the release version.",
    );
    expect(betaFailures).toContain("Beta releases must not contain stable soak evidence.");
    expect(betaFailures).toContain("A superseded beta must be a different numbered beta version.");

    const stable = stableManifest();
    stable.release.finalTags.beta = "not-a-beta";
    stable.release.soak = { ...stable.release.soak, betaVersion: "0.1.0-beta.3" };
    const stableFailures = releasePolicyFailures(
      stable,
      { ...packageJson, version: "0.1.0" },
      Date.parse("2026-07-29T00:00:00.000Z"),
    );
    expect(stableFailures).toContain(
      "Stable releases must preserve an explicit numbered beta channel.",
    );
    expect(stableFailures).toContain("Stable soak betaVersion must match the preserved beta tag.");
  });

  test("rejects early or incomplete stable promotion", () => {
    const manifest: ReleasePolicyManifest = {
      ...betaManifest(),
      version: "0.1.0",
      release: {
        candidateTag: "candidate",
        finalTags: { beta: "0.1.0-beta.6", latest: "0.1.0" },
        githubPrerelease: false,
        supersedes: "0.1.0-beta.3",
        soak: {
          betaVersion: "0.1.0-beta.6",
          startedAt: "2026-07-28T23:00:00.000Z",
          cohortEvidence: { linux: "not-a-workflow-url" },
        },
      },
    };
    const failures = releasePolicyFailures(
      manifest,
      { ...packageJson, version: "0.1.0" },
      Date.parse("2026-07-29T00:00:00.000Z"),
    );
    expect(failures).toContain(
      "Stable releases must not deprecate a superseded version automatically.",
    );
    expect(failures).toContain("Stable release requires a recorded 48-hour beta soak.");
    expect(failures.some((failure) => failure.includes("darwin"))).toBe(true);
    expect(failures.some((failure) => failure.includes("linux"))).toBe(true);
    expect(failures.some((failure) => failure.includes("windows"))).toBe(true);
  });

  test("allows only release metadata to differ from the accepted beta", () => {
    expect(stableDiffFailures(["package.json", "release-manifest.json", "PLAN.md"])).toEqual([]);
    expect(stableDiffFailures(["package.json", "src/tui.tsx"])).toEqual([
      "Stable release differs from its beta outside release metadata: src/tui.tsx",
    ]);
  });

  test("checks the stable beta tag and repository diff", () => {
    const directory = mkdtempSync(join(tmpdir(), "adrouter-release-policy-"));
    try {
      git(directory, "init");
      git(directory, "config", "user.name", "Release Test");
      git(directory, "config", "user.email", "release-test@example.invalid");
      writeFileSync(join(directory, "README.md"), "beta\n");
      git(directory, "add", "README.md");
      git(directory, "commit", "-m", "beta");

      const stable = stableManifest();
      expect(stableRepositoryFailures(betaManifest(), directory)).toEqual([]);
      expect(stableRepositoryFailures(stable, directory)).toEqual([
        "Stable release beta baseline tag is missing: v0.1.0-beta.6",
      ]);

      git(directory, "tag", "v0.1.0-beta.6");
      writeFileSync(join(directory, "README.md"), "stable\n");
      git(directory, "add", "README.md");
      git(directory, "commit", "-m", "stable metadata");
      expect(stableRepositoryFailures(stable, directory)).toEqual([]);
      expect(() =>
        assertReleasePolicy(
          stable,
          { ...packageJson, version: "0.1.0" },
          {
            checkRepository: true,
            cwd: directory,
            now: Date.parse("2026-07-29T00:00:00.000Z"),
          },
        ),
      ).not.toThrow();

      mkdirSync(join(directory, "src"));
      writeFileSync(join(directory, "src/tui.tsx"), "runtime change\n");
      git(directory, "add", "src/tui.tsx");
      git(directory, "commit", "-m", "runtime change");
      expect(stableRepositoryFailures(stable, directory)).toEqual([
        "Stable release differs from its beta outside release metadata: src/tui.tsx",
      ]);
      expect(() =>
        assertReleasePolicy(
          stable,
          { ...packageJson, version: "0.1.0" },
          {
            checkRepository: true,
            cwd: directory,
            now: Date.parse("2026-07-29T00:00:00.000Z"),
          },
        ),
      ).toThrow("src/tui.tsx");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
