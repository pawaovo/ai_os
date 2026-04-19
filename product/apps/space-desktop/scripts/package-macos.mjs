#!/usr/bin/env node
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appName = "AI OS";
const bundleIdentifier = "ai.os.space-demo";
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const productRoot = resolve(appRoot, "../..");
const buildRoot = join(productRoot, "build");
const appBundle = join(buildRoot, `${appName}.app`);
const contentsRoot = join(appBundle, "Contents");
const macosRoot = join(contentsRoot, "MacOS");
const resourcesRoot = join(contentsRoot, "Resources");
const bundledProductRoot = join(resourcesRoot, "product");
const nodeModulesAiOsRoot = join(bundledProductRoot, "node_modules", "@ai-os");

const workspacePackages = [
  ["apps/space-desktop", "space-desktop"],
  ["packages/companion/companion-core", "companion-core"],
  ["packages/control/approval-core", "approval-core"],
  ["packages/control/control-plane", "control-plane"],
  ["packages/conversation/conversation-core", "conversation-core"],
  ["packages/conversation/conversation-runtime", "conversation-runtime"],
  ["packages/executors/executor-claude-code", "executor-claude-code"],
  ["packages/executors/executor-codex", "executor-codex"],
  ["packages/executors/executor-protocol", "executor-protocol"],
  ["packages/kernel/kernel-events", "kernel-events"],
  ["packages/kernel/kernel-objects", "kernel-objects"],
  ["packages/model-providers/provider-anthropic-compatible", "provider-anthropic-compatible"],
  ["packages/model-providers/provider-openai-compatible", "provider-openai-compatible"],
  ["packages/model-providers/provider-protocol", "provider-protocol"],
  ["packages/model-providers/provider-registry", "provider-registry"],
  ["packages/workspace/artifact-core", "artifact-core"],
  ["packages/workspace/workspace-core", "workspace-core"],
];

run();

async function run() {
  execFileSync(process.execPath, ["./node_modules/typescript/bin/tsc", "-b"], {
    cwd: productRoot,
    stdio: "inherit",
  });

  await rm(appBundle, { recursive: true, force: true });
  await mkdir(macosRoot, { recursive: true });
  await mkdir(resourcesRoot, { recursive: true });
  await mkdir(nodeModulesAiOsRoot, { recursive: true });

  await writeFile(join(contentsRoot, "Info.plist"), createInfoPlist());
  await compileMacShell();
  await copyProductRuntime();

  process.stdout.write(`Created ${appBundle}\n`);
}

async function compileMacShell() {
  const source = join(appRoot, "native/macos/AIOSApp.swift");
  const output = join(macosRoot, "AIOSApp");

  execFileSync(
    "swiftc",
    [
      source,
      "-o",
      output,
      "-framework",
      "Cocoa",
      "-framework",
      "WebKit",
    ],
    {
      cwd: productRoot,
      stdio: "inherit",
    },
  );
}

async function copyProductRuntime() {
  await copyJson(join(productRoot, "package.json"), join(bundledProductRoot, "package.json"));
  await copyAppRuntime();

  for (const [relativePath, packageDirectoryName] of workspacePackages) {
    await copyWorkspacePackage(relativePath, packageDirectoryName);
  }
}

async function copyAppRuntime() {
  const bundledAppRoot = join(bundledProductRoot, "apps/space-desktop");

  await copyJson(join(appRoot, "package.json"), join(bundledAppRoot, "package.json"));
  await cp(join(appRoot, "dist"), join(bundledAppRoot, "dist"), { recursive: true });
  await cp(join(appRoot, "public"), join(bundledAppRoot, "public"), { recursive: true });
  await mkdir(join(bundledAppRoot, "scripts"), { recursive: true });
  await cp(join(appRoot, "scripts/dev-server.mjs"), join(bundledAppRoot, "scripts/dev-server.mjs"));
}

async function copyWorkspacePackage(relativePath, packageDirectoryName) {
  const sourceRoot = join(productRoot, relativePath);
  const bundledPackageRoot = join(bundledProductRoot, relativePath);
  const nodeModulePackageRoot = join(nodeModulesAiOsRoot, packageDirectoryName);

  await copyJson(join(sourceRoot, "package.json"), join(bundledPackageRoot, "package.json"));
  await cp(join(sourceRoot, "dist"), join(bundledPackageRoot, "dist"), { recursive: true });

  await copyJson(join(sourceRoot, "package.json"), join(nodeModulePackageRoot, "package.json"));
  await cp(join(sourceRoot, "dist"), join(nodeModulePackageRoot, "dist"), { recursive: true });
}

async function copyJson(source, destination) {
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
}

function createInfoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleExecutable</key>
  <string>AIOSApp</string>
  <key>CFBundleIdentifier</key>
  <string>${bundleIdentifier}</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>${appName}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>0.6.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>14.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
`;
}
