import { opendir, realpath, stat } from "node:fs/promises";
import * as path from "node:path";
import { minimatch } from "minimatch";
import type { ProjectScanConfig } from "../config";
import { resolveScanRoot } from "./pathResolver";

export interface ScanResult {
  candidates: string[];
  warnings: string[];
}

interface QueueEntry {
  absolutePath: string;
  relativePath: string;
  depth: number;
}

export class ProjectScanner {
  async scan(config: ProjectScanConfig): Promise<ScanResult> {
    const warnings: string[] = [];
    const roots = await this.resolveRoots(config.scanRoots, warnings);
    const candidates = new Set<string>();
    const maxDepth = Math.max(0, Math.floor(config.maxDepth));

    await Promise.all(
      roots.map((root) =>
        this.scanRoot(root, maxDepth, config.excludes, candidates, warnings),
      ),
    );

    return { candidates: [...candidates], warnings };
  }

  private async resolveRoots(inputs: string[], warnings: string[]): Promise<string[]> {
    const roots = new Set<string>();

    for (const input of inputs) {
      const resolution = resolveScanRoot(input);
      if (!resolution.ok) {
        warnings.push(`${input}: ${resolution.reason}`);
        continue;
      }

      try {
        const info = await stat(resolution.path);
        if (!info.isDirectory()) {
          warnings.push(`${input}: 不是目录`);
          continue;
        }
        roots.add(await realpath(resolution.path));
      } catch (error) {
        warnings.push(`${input}: ${formatError(error)}`);
      }
    }

    return [...roots];
  }

  private async scanRoot(
    root: string,
    maxDepth: number,
    excludes: string[],
    candidates: Set<string>,
    warnings: string[],
  ): Promise<void> {
    const queue: QueueEntry[] = [{ absolutePath: root, relativePath: "", depth: 0 }];
    let cursor = 0;

    while (cursor < queue.length) {
      const current = queue[cursor++];

      try {
        const directory = await opendir(current.absolutePath);
        const children = [];
        let isGitProject = false;

        for await (const child of directory) {
          if (child.name === ".git") {
            isGitProject = child.isDirectory() || child.isFile();
            continue;
          }
          children.push(child);
        }

        if (isGitProject) {
          candidates.add(current.absolutePath);
        }

        if (current.depth >= maxDepth) {
          continue;
        }

        for (const child of children) {
          if (!child.isDirectory() || child.isSymbolicLink()) {
            continue;
          }
          const relativePath = current.relativePath
            ? path.posix.join(current.relativePath, child.name)
            : child.name;
          if (isExcluded(relativePath, excludes)) {
            continue;
          }
          queue.push({
            absolutePath: path.join(current.absolutePath, child.name),
            relativePath,
            depth: current.depth + 1,
          });
        }
      } catch (error) {
        warnings.push(`${current.absolutePath}: ${formatError(error)}`);
      }
    }
  }
}

export function isExcluded(relativePath: string, patterns: string[]): boolean {
  const normalized = relativePath.split(path.sep).join("/");
  return patterns.some((pattern) => {
    const options = { dot: true, nocase: process.platform !== "linux" };
    return (
      minimatch(normalized, pattern, options) ||
      minimatch(`${normalized}/`, pattern, options) ||
      minimatch(normalized, pattern.replace(/\/\*\*$/, ""), options)
    );
  });
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
