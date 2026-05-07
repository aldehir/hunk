import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  resolveBundledHunkReviewSkillPath,
  resolveGlobalConfigPath,
  resolveHunkStatePath,
} from "./paths";

function createTempRoot(prefix: string) {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("paths", () => {
  test("resolves XDG config and state paths", () => {
    const xdgHome = join("/tmp", "xdg-home");
    const env = { XDG_CONFIG_HOME: xdgHome } as NodeJS.ProcessEnv;

    expect(resolveGlobalConfigPath(env)).toBe(join(xdgHome, "hunk", "config.toml"));
    expect(resolveHunkStatePath(env)).toBe(join(xdgHome, "hunk", "state.json"));
  });

  test("falls back to HOME for config and state paths", () => {
    const home = join("/tmp", "home");
    const env = { HOME: home } as NodeJS.ProcessEnv;

    expect(resolveGlobalConfigPath(env)).toBe(join(home, ".config", "hunk", "config.toml"));
    expect(resolveHunkStatePath(env)).toBe(join(home, ".config", "hunk", "state.json"));
  });

  test("falls back to USERPROFILE on Windows shells without HOME", () => {
    const userProfile = "C:\\Users\\Alde";
    const env = { USERPROFILE: userProfile } as NodeJS.ProcessEnv;

    expect(resolveGlobalConfigPath(env)).toBe(join(userProfile, ".config", "hunk", "config.toml"));
    expect(resolveHunkStatePath(env)).toBe(join(userProfile, ".config", "hunk", "state.json"));
  });

  test("prefers HOME over USERPROFILE when both are set", () => {
    const home = join("/tmp", "home");
    const env = { HOME: home, USERPROFILE: "C:\\Users\\Alde" } as NodeJS.ProcessEnv;

    expect(resolveGlobalConfigPath(env)).toBe(join(home, ".config", "hunk", "config.toml"));
  });

  test("locates the bundled Hunk review skill from source", () => {
    const resolvedPath = resolveBundledHunkReviewSkillPath([import.meta.dir]);

    expect(resolvedPath).toEndWith(join("skills", "hunk-review", "SKILL.md"));
  });

  test("locates the bundled Hunk review skill through a nested hunkdiff package", () => {
    const tempRoot = createTempRoot("hunk-skill-path-");

    try {
      const nestedPackageRoot = join(tempRoot, "node_modules", "hunkdiff");
      const skillPath = join(nestedPackageRoot, "skills", "hunk-review", "SKILL.md");
      const fakeBinary = join(tempRoot, "node_modules", "hunkdiff-linux-x64", "bin", "hunk");

      mkdirSync(dirname(skillPath), { recursive: true });
      mkdirSync(dirname(fakeBinary), { recursive: true });
      writeFileSync(skillPath, "# skill\n");
      writeFileSync(fakeBinary, "binary\n");

      expect(resolveBundledHunkReviewSkillPath([fakeBinary])).toBe(skillPath);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
