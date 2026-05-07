#!/usr/bin/env bun

import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { binaryFilenameForSpec, getHostPlatformPackageSpec } from "./prebuilt-package-helpers";

const repoRoot = path.resolve(import.meta.dir, "..");
const distDir = path.join(repoRoot, "dist");
const binaryName = binaryFilenameForSpec(getHostPlatformPackageSpec());
const outfile = path.join(distDir, binaryName);
const legacyName = binaryName.replace(/^hunk/, "otdiff");
const legacyOutfile = path.join(distDir, legacyName);

mkdirSync(distDir, { recursive: true });
rmSync(legacyOutfile, { force: true });

const result = Bun.spawnSync(
  ["bun", "build", "--compile", path.join(repoRoot, "src", "main.tsx"), "--outfile", outfile],
  {
    cwd: repoRoot,
    stdio: ["inherit", "inherit", "inherit"],
    env: {
      ...process.env,
      BUN_TMPDIR: path.join(repoRoot, ".bun-tmp"),
      BUN_INSTALL: path.join(repoRoot, ".bun-install"),
    },
  },
);

if (result.exitCode !== 0) {
  process.exit(result.exitCode ?? 1);
}

console.log(`Built ${outfile}`);
