import releaseManifest from "../release-manifest.json" with { type: "json" };

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const [channel, expectedVersion] = process.argv.slice(2);
assert(channel === "beta" || channel === "latest", "Channel must be beta or latest.");
assert(
  /^\d+\.\d+\.\d+(?:-beta\.\d+)?$/.test(expectedVersion ?? ""),
  "Expected version is invalid.",
);

const child = Bun.spawn(
  [
    "npm",
    "view",
    releaseManifest.npm.package,
    "dist-tags",
    "--json",
    "--registry",
    "https://registry.npmjs.org/",
  ],
  { stdin: "ignore", stdout: "pipe", stderr: "inherit" },
);
const output = await new Response(child.stdout).text();
assert((await child.exited) === 0, "Unable to read public npm dist-tags.");
const tags = JSON.parse(output) as Record<string, string>;
assert(
  tags[channel] === expectedVersion,
  `${channel} resolves to ${tags[channel]}, not ${expectedVersion}.`,
);
assert(
  tags[releaseManifest.release.candidateTag] === undefined,
  "Candidate tag remains during soak verification.",
);
console.log(
  `${releaseManifest.npm.package}@${channel} resolves to ${expectedVersion} with no candidate tag.`,
);
