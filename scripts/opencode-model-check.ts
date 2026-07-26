import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Config } from "@opencode-ai/plugin";
import { applyAdRouterConfig } from "../src/server.js";

const pluginManifest = JSON.parse(
  readFileSync(
    new URL("../node_modules/@opencode-ai/plugin/package.json", import.meta.url),
    "utf8",
  ),
) as { version: string };
if (pluginManifest.version !== "1.18.4") {
  throw new Error(`Expected OpenCode plugin 1.18.4, received ${pluginManifest.version}.`);
}

const config: Config = {};
applyAdRouterConfig(config);
const models = config.provider?.adrouter?.models ?? {};
for (const pickerID of ["deepseek-v4-flash", "deepseek-v4-pro"]) {
  const configured = models[pickerID];
  if (!configured) throw new Error(`OpenCode did not register ${pickerID}.`);
  const apiID = configured.id ?? pickerID;
  if (apiID !== pickerID) {
    throw new Error(`OpenCode resolved ${pickerID} to api.id=${apiID}.`);
  }
}

console.log("OpenCode 1.18.4 resolved both AdRouter api.id values to backend slugs.");

const directory = mkdtempSync(join(tmpdir(), "adrouter-opencode-1.18.4-"));
try {
  const pluginDirectory = join(directory, ".opencode", "plugins");
  mkdirSync(pluginDirectory, { recursive: true });
  const serverEntry = pathToFileURL(join(import.meta.dir, "..", "dist", "server.js")).href;
  writeFileSync(
    join(pluginDirectory, "adrouter.js"),
    `export { default } from ${JSON.stringify(serverEntry)};\n`,
  );
  const xdg = join(directory, "xdg");
  const child = Bun.spawn(["bunx", "opencode-ai@1.18.4", "models", "adrouter", "--verbose"], {
    cwd: directory,
    env: {
      ...process.env,
      XDG_CACHE_HOME: join(xdg, "cache"),
      XDG_CONFIG_HOME: join(xdg, "config"),
      XDG_DATA_HOME: join(xdg, "data"),
      XDG_STATE_HOME: join(xdg, "state"),
    },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) throw new Error(`OpenCode 1.18.4 model resolution failed: ${stderr}`);
  for (const modelID of ["deepseek-v4-flash", "deepseek-v4-pro"]) {
    if (!stdout.includes(`adrouter/${modelID}`) || !stdout.includes(`"id": "${modelID}"`)) {
      throw new Error(`OpenCode 1.18.4 did not resolve api.id=${modelID}.\n${stdout}`);
    }
  }
  console.log("OpenCode 1.18.4 CLI integration resolved both effective api.id values.");
} finally {
  rmSync(directory, { force: true, recursive: true });
}
