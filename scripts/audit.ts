import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import manifest from "../package.json" with { type: "json" };

async function run(command: string[], cwd: string): Promise<void> {
  const child = Bun.spawn(command, { cwd, stdin: "ignore", stdout: "inherit", stderr: "inherit" });
  const exitCode = await child.exited;
  if (exitCode !== 0) throw new Error(`${command.join(" ")} failed with exit code ${exitCode}.`);
}

const directory = mkdtempSync(join(tmpdir(), "adrouter-prod-audit-"));
try {
  writeFileSync(
    join(directory, "package.json"),
    `${JSON.stringify({ private: true, dependencies: manifest.dependencies }, null, 2)}\n`,
  );
  await run(["bun", "install", "--ignore-scripts"], directory);
  await run(["bun", "audit", "--audit-level=low"], directory);
  await run(["bun", "audit", "--audit-level=high"], `${import.meta.dir}/..`);
} finally {
  rmSync(directory, { force: true, recursive: true });
}
