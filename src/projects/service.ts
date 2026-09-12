import * as vscode from "vscode";
import { getProjectScanConfig } from "../config";
import { GitProjectResolver } from "./gitProjectResolver";
import type { ProjectRecord } from "./model";
import { ProjectScanner } from "./scanner";
import { ProjectStore } from "./store";

export class ProjectService implements vscode.Disposable {
  private readonly changes = new vscode.EventEmitter<void>();
  private scanPromise: Promise<void> | undefined;

  readonly onDidChange = this.changes.event;

  constructor(
    private readonly store: ProjectStore,
    private readonly scanner: ProjectScanner,
    private readonly resolver: GitProjectResolver,
    private readonly output: vscode.LogOutputChannel,
  ) {}

  getProjects(): ProjectRecord[] {
    return this.store.getAll().sort(compareProjects);
  }

  async registerCurrentProject(): Promise<ProjectRecord | undefined> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder || folder.uri.scheme !== "file") {
      return undefined;
    }
    return this.recordVisit(folder.uri.fsPath);
  }

  async recordVisit(projectPath: string, manual = false): Promise<ProjectRecord | undefined> {
    const project = await this.resolver.resolve(projectPath);
    if (!project) {
      return undefined;
    }
    await this.store.recordVisit(project, manual);
    this.changes.fire();
    return project;
  }

  refresh(): Promise<void> {
    if (this.scanPromise) {
      return this.scanPromise;
    }

    this.scanPromise = this.performScan().finally(() => {
      this.scanPromise = undefined;
    });
    return this.scanPromise;
  }

  private async performScan(): Promise<void> {
    const result = await this.scanner.scan(getProjectScanConfig());
    for (const warning of result.warnings) {
      this.output.warn(warning);
    }

    const discovered = (
      await mapWithConcurrency(result.candidates, 8, (candidate) => this.resolver.resolve(candidate))
    ).filter((project): project is ProjectRecord => project !== undefined);

    const grouped = new Map<string, ProjectRecord>();
    for (const project of discovered) {
      grouped.set(project.id, {
        ...project,
        lastPath: project.rootPath,
        scanned: true,
      });
    }
    await this.store.replaceScanned([...grouped.values()]);
    this.output.info(`项目扫描完成：发现 ${grouped.size} 个 Git 项目。`);
    this.changes.fire();
  }

  dispose(): void {
    this.changes.dispose();
  }
}

function compareProjects(left: ProjectRecord, right: ProjectRecord): number {
  const recent = (right.lastVisitedAt ?? 0) - (left.lastVisitedAt ?? 0);
  return recent || left.name.localeCompare(right.name);
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  operation: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await operation(values[index]);
    }
  });

  await Promise.all(workers);
  return results;
}
