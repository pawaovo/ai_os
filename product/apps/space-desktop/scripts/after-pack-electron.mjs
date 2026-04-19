#!/usr/bin/env node
import { access, copyFile, mkdir, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";

export default async function afterPack(context) {
  const resourcesDir = await resolveResourcesDir(context.appOutDir);
  const packagedAppPackage = join(resourcesDir, "app", "package.json");
  try {
    await access(packagedAppPackage, constants.F_OK);
    return;
  } catch {}

  const sourcePackage = resolve(context.packager.projectDir, "apps/space-desktop/electron-app/package.json");
  await mkdir(join(resourcesDir, "app"), { recursive: true });
  await copyFile(sourcePackage, packagedAppPackage);
}

async function resolveResourcesDir(appOutDir) {
  const directResources = resolve(appOutDir, "Contents", "Resources");
  try {
    await access(directResources, constants.F_OK);
    return directResources;
  } catch {}

  const entries = await readdir(appOutDir, { withFileTypes: true });
  const appBundle = entries.find((entry) => entry.isDirectory() && entry.name.endsWith(".app"));
  if (!appBundle) throw new Error(`Unable to locate packaged .app in ${appOutDir}`);
  return resolve(appOutDir, appBundle.name, "Contents", "Resources");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const appOutDir = process.argv[2];
  const projectDir = process.argv[3];
  if (!appOutDir || !projectDir) {
    throw new Error("Usage: node after-pack-electron.mjs <appOutDir> <projectDir>");
  }
  await afterPack({
    appOutDir,
    packager: {
      projectDir,
    },
  });
}
