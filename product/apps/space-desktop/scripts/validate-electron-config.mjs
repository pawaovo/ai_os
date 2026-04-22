#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const productRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const packageJson = JSON.parse(await readFile(resolve(productRoot, "package.json"), "utf8"));
const builderConfig = await import(resolve(productRoot, "electron-builder.config.cjs"));
const config = builderConfig.default ?? builderConfig;

assert(packageJson.main === "apps/space-desktop/electron-app/main.cjs", "package.json main must point to Electron main.");
assert(packageJson.scripts["package:mac"] === "npm run package:electron:mac", "package:mac must use Electron packaging.");
assert(
  packageJson.scripts["package:electron:mac"]?.includes("prepare-electron-package-output.mjs"),
  "package:electron:mac must clear stale legacy macOS bundles before packaging.",
);
assert(Boolean(packageJson.scripts["package:win"]), "package:win script is required.");
assert(Boolean(packageJson.devDependencies?.electron), "electron devDependency is required.");
assert(Boolean(packageJson.devDependencies?.["electron-builder"]), "electron-builder devDependency is required.");
assert(config.directories?.app === "apps/space-desktop/electron-app", "Electron builder app directory must be explicit.");
assert(config.appId === "ai.os.personal", "Electron appId must be stable.");
assert(config.productName === "AI OS", "Electron productName must be AI OS.");
assert(config.asar === false, "asar must stay disabled while the local server is launched from runtime resources.");
assert(config.afterPack === "apps/space-desktop/scripts/after-pack-electron.mjs", "afterPack must keep Electron app package metadata in place.");
assert(config.mac?.target?.includes("dir"), "mac dir target is required for local smoke tests.");
assert(Array.isArray(config.win?.target) && config.win.target.length >= 2, "Windows targets must include installer and portable outputs.");
assert(config.extraResources.some((entry) => entry.to === "product/apps/space-desktop"), "space-desktop runtime must be copied.");
assert(config.extraResources.some((entry) => entry.to === "product/node_modules/@ai-os/provider-registry"), "workspace packages must be available under runtime node_modules.");
assert(
  config.extraResources.some((entry) => entry.to === "product/apps/space-desktop" && entry.filter?.includes("scripts/mcp-runtime.mjs")),
  "space-desktop MCP runtime helper must be copied for packaged Electron runs.",
);
assert(
  config.extraResources.some((entry) => entry.to === "product/apps/space-desktop" && entry.filter?.includes("scripts/mcp-hosted-server.mjs")),
  "space-desktop MCP hosted server helper must be copied for packaged Electron runs.",
);

process.stdout.write("Electron config is valid.\n");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
