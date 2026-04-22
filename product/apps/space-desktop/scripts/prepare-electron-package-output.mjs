#!/usr/bin/env node
import { rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const productRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const legacyMacBundle = join(productRoot, "build", "AI OS.app");

await rm(legacyMacBundle, { recursive: true, force: true });
process.stdout.write(`Prepared Electron package output. Removed stale legacy bundle at ${legacyMacBundle}\n`);
