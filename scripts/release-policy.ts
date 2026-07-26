import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import packageManifest from "../package.json" with { type: "json" };
import releaseManifest from "../release-manifest.json" with { type: "json" };

const BETA_VERSION = /^\d+\.\d+\.\d+-beta\.\d+$/;
const STABLE_VERSION = /^\d+\.\d+\.\d+$/;
const MINIMUM_SOAK_MS = 48 * 60 * 60 * 1000;

export interface ReleasePolicyManifest {
  schema: number;
  version: string;
  release: {
    candidateTag: string;
    finalTags: Record<string, string>;
    githubPrerelease: boolean;
    supersedes?: string;
    soak?: {
      betaVersion?: string;
      startedAt?: string;
      cohortEvidence?: Partial<Record<"darwin" | "linux" | "windows", string>>;
    };
  };
  npm: {
    package: string;
    opencodeVersions: string[];
  };
}

interface PackagePolicyManifest {
  name: string;
  version: string;
  publishConfig?: { tag?: string };
}

export const STABLE_METADATA_PATHS = new Set([
  "CHANGELOG.md",
  "PLAN.md",
  "README.md",
  "RELEASE.md",
  "SECURITY.md",
  "package.json",
  "release-manifest.json",
]);

export function isBetaRelease(version: string): boolean {
  return BETA_VERSION.test(version);
}

export function stableDiffFailures(paths: Iterable<string>): string[] {
  const behaviorChanges = [...paths]
    .filter(Boolean)
    .filter((path) => !STABLE_METADATA_PATHS.has(path));
  return behaviorChanges.length > 0
    ? [
        `Stable release differs from its beta outside release metadata: ${behaviorChanges.join(", ")}`,
      ]
    : [];
}

export function releasePolicyFailures(
  manifest: ReleasePolicyManifest,
  packageJson: PackagePolicyManifest,
  now = Date.now(),
): string[] {
  const failures: string[] = [];
  const prerelease = isBetaRelease(manifest.version);
  const stable = STABLE_VERSION.test(manifest.version);
  const finalTags = manifest.release?.finalTags ?? {};
  const finalTagNames = Object.keys(finalTags).sort();

  if (manifest.schema !== 2) failures.push("Release manifest schema must be 2.");
  if (!prerelease && !stable) failures.push("Release version must be stable or a numbered beta.");
  if (packageJson.version !== manifest.version)
    failures.push("Package and release versions differ.");
  if (manifest.npm?.package !== packageJson.name) failures.push("Release package name differs.");
  if (manifest.release?.candidateTag !== "candidate")
    failures.push("Candidate tag must be candidate.");
  if (packageJson.publishConfig?.tag !== manifest.release?.candidateTag) {
    failures.push("Package publication tag must match the release candidate tag.");
  }
  if (finalTagNames.join(",") !== "beta,latest") {
    failures.push("Final tags must contain exactly beta and latest.");
  }
  if (finalTags.latest !== manifest.version)
    failures.push("Latest must target the release version.");
  if (manifest.release?.githubPrerelease !== prerelease) {
    failures.push("GitHub prerelease state must match the release version channel.");
  }
  if (
    !Array.isArray(manifest.npm?.opencodeVersions) ||
    manifest.npm.opencodeVersions.length === 0 ||
    manifest.npm.opencodeVersions.some((version) => !/^\d+\.\d+\.\d+$/.test(version)) ||
    new Set(manifest.npm.opencodeVersions).size !== manifest.npm.opencodeVersions.length
  ) {
    failures.push("OpenCode release matrix must contain unique exact versions.");
  }

  if (prerelease) {
    if (finalTags.beta !== manifest.version) {
      failures.push("Beta releases must promote both beta and latest to the release version.");
    }
    if (manifest.release.soak !== undefined)
      failures.push("Beta releases must not contain stable soak evidence.");
    if (
      manifest.release.supersedes !== undefined &&
      (!BETA_VERSION.test(manifest.release.supersedes) ||
        manifest.release.supersedes === manifest.version)
    ) {
      failures.push("A superseded beta must be a different numbered beta version.");
    }
  }

  if (stable) {
    if (!BETA_VERSION.test(finalTags.beta ?? "")) {
      failures.push("Stable releases must preserve an explicit numbered beta channel.");
    }
    if (manifest.release.supersedes !== undefined) {
      failures.push("Stable releases must not deprecate a superseded version automatically.");
    }
    const soak = manifest.release.soak;
    const startedAt = Date.parse(soak?.startedAt ?? "");
    if (soak?.betaVersion !== finalTags.beta) {
      failures.push("Stable soak betaVersion must match the preserved beta tag.");
    }
    if (!Number.isFinite(startedAt) || now - startedAt < MINIMUM_SOAK_MS) {
      failures.push("Stable release requires a recorded 48-hour beta soak.");
    }
    for (const platform of ["darwin", "linux", "windows"] as const) {
      const evidence = soak?.cohortEvidence?.[platform];
      if (
        typeof evidence !== "string" ||
        !evidence.startsWith("https://github.com/adrouter/adrouter-opencode/actions/runs/")
      ) {
        failures.push(
          `Stable release requires an authenticated GitHub Actions evidence URL for ${platform}.`,
        );
      }
    }
  }

  return failures;
}

export function stableRepositoryFailures(
  manifest: ReleasePolicyManifest,
  cwd = resolve(import.meta.dir, ".."),
): string[] {
  if (isBetaRelease(manifest.version)) return [];
  const betaVersion = manifest.release.finalTags.beta;
  const betaTag = `v${betaVersion}`;
  const exists = spawnSync("git", ["rev-parse", "--verify", "--quiet", `${betaTag}^{commit}`], {
    cwd,
    encoding: "utf8",
  });
  if (exists.status !== 0) return [`Stable release beta baseline tag is missing: ${betaTag}`];

  const diff = spawnSync("git", ["diff", "--name-only", betaTag, "HEAD"], {
    cwd,
    encoding: "utf8",
  });
  if (diff.status !== 0) return [`Unable to compare stable release with ${betaTag}.`];
  return stableDiffFailures(diff.stdout.split(/\r?\n/));
}

export function assertReleasePolicy(
  manifest: ReleasePolicyManifest,
  packageJson: PackagePolicyManifest,
  options: { checkRepository?: boolean; cwd?: string; now?: number } = {},
): void {
  const failures = releasePolicyFailures(manifest, packageJson, options.now);
  if (options.checkRepository) {
    failures.push(...stableRepositoryFailures(manifest, options.cwd));
  }
  if (failures.length > 0) throw new Error(failures.join("\n"));
}

if (import.meta.main) {
  assertReleasePolicy(releaseManifest, packageManifest, { checkRepository: true });
  console.log(`Release policy for ${releaseManifest.version} passed.`);
}
