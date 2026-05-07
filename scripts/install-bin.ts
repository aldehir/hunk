#!/usr/bin/env bun

import { chmodSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { binaryFilenameForSpec, getHostPlatformPackageSpec } from "./prebuilt-package-helpers";

const repoRoot = path.resolve(import.meta.dir, "..");
const binaryName = binaryFilenameForSpec(getHostPlatformPackageSpec());
const binaryPath = path.join(repoRoot, "dist", binaryName);
const installDir = process.env.HUNK_INSTALL_DIR ?? path.join(os.homedir(), ".local", "bin");
const installPath = path.join(installDir, binaryName);
const legacyName = binaryName.replace(/^hunk/, "otdiff");
const legacyInstallPath = path.join(installDir, legacyName);

const buildScript = path.join(import.meta.dir, "build-bin.ts");
const buildResult = Bun.spawnSync(["bun", "run", buildScript], {
  cwd: repoRoot,
  stdio: ["inherit", "inherit", "inherit"],
});
if (buildResult.exitCode !== 0) {
  process.exit(buildResult.exitCode ?? 1);
}

mkdirSync(installDir, { recursive: true });
copyFileSync(binaryPath, installPath);
// chmod is a no-op on NTFS but keeps unix install bits sane.
try {
  chmodSync(installPath, 0o755);
} catch {
  // ignore on platforms where chmod is unsupported
}
rmSync(legacyInstallPath, { force: true });

console.log(`Installed ${installPath}`);

const pathSep = process.platform === "win32" ? ";" : ":";
const pathEntries = (process.env.PATH ?? "").split(pathSep);
const onPath = pathEntries.some((entry) => {
  if (!entry) return false;
  return process.platform === "win32"
    ? entry.toLowerCase() === installDir.toLowerCase()
    : entry === installDir;
});
if (!onPath) {
  console.error(`Warning: ${installDir} is not on PATH`);
}
