import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectScanner, isExcluded } from "../src/projects/scanner";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("ProjectScanner", () => {
  it("discovers nested repositories and honors maxDepth", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "project-switcher-"));
    temporaryDirectories.push(root);
    const resolvedRoot = await realpath(root);
    await createGitMarker(path.join(root, "top"));
    await createGitMarker(path.join(root, "group", "nested"));

    const scanner = new ProjectScanner();
    const shallow = await scanner.scan({
      scanRoots: [root],
      excludes: [],
      maxDepth: 1,
      scanOnStartup: false,
    });
    const deep = await scanner.scan({
      scanRoots: [root],
      excludes: [],
      maxDepth: 2,
      scanOnStartup: false,
    });

    expect(shallow.candidates).toEqual([path.join(resolvedRoot, "top")]);
    expect(deep.candidates.sort()).toEqual(
      [path.join(resolvedRoot, "top"), path.join(resolvedRoot, "group", "nested")].sort(),
    );
  });

  it("recognizes .git files used by worktrees", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "project-switcher-"));
    temporaryDirectories.push(root);
    const resolvedRoot = await realpath(root);
    const worktree = path.join(root, "feature");
    await mkdir(worktree, { recursive: true });
    await writeFile(path.join(worktree, ".git"), "gitdir: /tmp/example\n");

    const result = await new ProjectScanner().scan({
      scanRoots: [root],
      excludes: [],
      maxDepth: 1,
      scanOnStartup: false,
    });

    expect(result.candidates).toEqual([path.join(resolvedRoot, "feature")]);
  });
});

describe("isExcluded", () => {
  it("prunes common directory patterns at their directory boundary", () => {
    expect(isExcluded("app/node_modules", ["**/node_modules/**"])).toBe(true);
    expect(isExcluded("app/node_modules/pkg", ["**/node_modules/**"])).toBe(true);
    expect(isExcluded("app/src", ["**/node_modules/**"])).toBe(false);
  });
});

async function createGitMarker(directory: string): Promise<void> {
  await mkdir(path.join(directory, ".git"), { recursive: true });
}
