import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";
import type { ProjectRecord, WorktreeRecord } from "./model";

const execFileAsync = promisify(execFile);

interface PorcelainWorktree {
  path: string;
  branch?: string;
  detached: boolean;
}

export class GitProjectResolver {
  async resolve(candidatePath: string): Promise<ProjectRecord | undefined> {
    try {
      const [topLevelResult, commonDirResult, worktreeResult] = await Promise.all([
        this.git(candidatePath, ["rev-parse", "--show-toplevel"]),
        this.git(candidatePath, ["rev-parse", "--git-common-dir"]),
        this.git(candidatePath, ["worktree", "list", "--porcelain", "-z"]),
      ]);

      const topLevel = path.normalize(topLevelResult.trim());
      const rawCommonDir = commonDirResult.trim();
      const absoluteCommonDir = path.isAbsolute(rawCommonDir)
        ? rawCommonDir
        : path.resolve(topLevel, rawCommonDir);
      const id = normalizeIdentity(await realpath(absoluteCommonDir));
      const parsedWorktrees = parseWorktreePorcelain(worktreeResult);
      const worktrees = await Promise.all(
        parsedWorktrees.map(async (worktree, index): Promise<WorktreeRecord> => ({
          path: await realpath(worktree.path).catch(() => path.normalize(worktree.path)),
          branch: worktree.branch,
          detached: worktree.detached,
          main: index === 0,
        })),
      );
      const primaryPath = worktrees[0]?.path ?? topLevel;
      const currentPath = await realpath(topLevel).catch(() => topLevel);

      return {
        id,
        name: path.basename(primaryPath),
        rootPath: primaryPath,
        lastPath: currentPath,
        worktrees,
        scanned: false,
        manual: false,
      };
    } catch {
      return undefined;
    }
  }

  private async git(cwd: string, args: string[]): Promise<string> {
    const result = await execFileAsync("git", ["-C", cwd, ...args], {
      encoding: "utf8",
      timeout: 10_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return result.stdout;
  }
}

export function parseWorktreePorcelain(output: string): PorcelainWorktree[] {
  const records: PorcelainWorktree[] = [];
  let current: PorcelainWorktree | undefined;

  for (const line of output.split(/\0|\r?\n/)) {
    if (line.startsWith("worktree ")) {
      if (current) {
        records.push(current);
      }
      current = { path: line.slice("worktree ".length), detached: false };
    } else if (current && line.startsWith("branch ")) {
      current.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
    } else if (current && line === "detached") {
      current.detached = true;
    }
  }

  if (current) {
    records.push(current);
  }

  return records;
}

function normalizeIdentity(value: string): string {
  const normalized = path.normalize(value);
  return process.platform === "win32" || process.platform === "darwin"
    ? normalized.toLocaleLowerCase()
    : normalized;
}
