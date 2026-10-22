import type * as vscode from "vscode";
import type { ProjectRecord, StoredProjectState } from "./model";

const storageKey = "projectsSwitch.projects.v1";

export class ProjectStore {
  constructor(private readonly state: vscode.Memento) {}

  getAll(): ProjectRecord[] {
    return this.state.get<StoredProjectState>(storageKey, { version: 1, projects: [] }).projects;
  }

  async save(projects: ProjectRecord[]): Promise<void> {
    await this.state.update(storageKey, { version: 1, projects } satisfies StoredProjectState);
  }

  async recordVisit(project: ProjectRecord, manual = false): Promise<void> {
    const projects = this.getAll();
    const existing = projects.find((item) => item.id === project.id);
    const next: ProjectRecord = {
      ...project,
      lastVisitedAt: Date.now(),
      scanned: existing?.scanned ?? project.scanned,
      manual: manual || existing?.manual || project.manual,
    };
    await this.save([next, ...projects.filter((item) => item.id !== project.id)]);
  }

  async replaceScanned(discovered: ProjectRecord[]): Promise<void> {
    const projects = new Map(
      this.getAll()
        .filter((project) => project.manual || project.lastVisitedAt !== undefined)
        .map((project) => [project.id, { ...project, scanned: false }]),
    );

    for (const project of discovered) {
      const existing = projects.get(project.id);
      projects.set(project.id, {
        ...project,
        lastPath: existing?.lastPath ?? project.lastPath,
        lastVisitedAt: existing?.lastVisitedAt,
        scanned: true,
        manual: existing?.manual ?? false,
      });
    }

    await this.save([...projects.values()]);
  }
}
