import { execFile } from "node:child_process";
import { mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { GitProjectResolver, parseWorktreePorcelain } from "../src/projects/gitProjectResolver";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("parseWorktreePorcelain", () => {
  it("parses branches and detached worktrees", () => {
    const result = parseWorktreePorcelain(
      [
        "worktree /code/app",
        "HEAD 1111111",
        "branch refs/heads/main",
        "",
        "worktree /code/app.worktrees/feature with spaces",
        "HEAD 2222222",
        "branch refs/heads/feature/login",
        "",
        "worktree /code/app.worktrees/review",
        "HEAD 3333333",
        "detached",
        "",
      ].join("\0"),
    );

    expect(result).toEqual([
      { path: "/code/app", branch: "main", detached: false },
      {
        path: "/code/app.worktrees/feature with spaces",
        branch: "feature/login",
        detached: false,
      },
      { path: "/code/app.worktrees/review", detached: true },
    ]);
  });

  it("groups a linked worktree with its main Git project", async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "project-switcher-git-"));
    temporaryDirectories.push(temporaryRoot);
    const mainPath = path.join(temporaryRoot, "main project");
    const worktreePath = path.join(temporaryRoot, "feature worktree");
    await mkdir(mainPath);
    await git(temporaryRoot, ["init", "-q", mainPath]);
    await git(mainPath, ["config", "user.email", "test@example.com"]);
    await git(mainPath, ["config", "user.name", "Test"]);
    await writeFile(path.join(mainPath, "README.md"), "test\n");
    await git(mainPath, ["add", "README.md"]);
    await git(mainPath, ["commit", "-qm", "initial"]);
    await git(mainPath, ["worktree", "add", "-qb", "feature/test", worktreePath]);

    const resolver = new GitProjectResolver();
    const [main, worktree] = await Promise.all([
      resolver.resolve(mainPath),
      resolver.resolve(worktreePath),
    ]);

    expect(main?.id).toBe(worktree?.id);
    expect(main?.rootPath).toBe(await realpath(mainPath));
    expect(worktree?.lastPath).toBe(await realpath(worktreePath));
    expect(main?.worktrees).toEqual([
      {
        path: await realpath(mainPath),
        branch: expect.any(String),
        detached: false,
        main: true,
      },
      {
        path: await realpath(worktreePath),
        branch: "feature/test",
        detached: false,
        main: false,
      },
    ]);
  });
});

async function git(cwd: string, args: string[]): Promise<void> {
  await execFileAsync("git", ["-C", cwd, ...args]);
}
