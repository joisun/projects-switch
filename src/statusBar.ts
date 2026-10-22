import * as vscode from "vscode";
import { ProjectService } from "./projects/service";

export class ContextStatusBar implements vscode.Disposable {
  private readonly projectItem = vscode.window.createStatusBarItem(
    "projectsSwitch.project",
    vscode.StatusBarAlignment.Left,
    1_000,
  );
  private readonly subscriptions: vscode.Disposable[];

  constructor(projects: ProjectService) {
    this.projectItem.name = "Projects Switch: Projects";
    this.projectItem.command = "projectsSwitch.switchProject";
    this.projectItem.tooltip = "切换 Project";

    this.subscriptions = [
      projects.onDidChange(() => this.refresh(projects)),
    ];
    this.refresh(projects);
  }

  refresh(projects: ProjectService): void {
    const currentPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const project = projects
      .getProjects()
      .find((candidate) =>
        candidate.worktrees.some((worktree) => samePath(worktree.path, currentPath)),
      );
    this.projectItem.text = `$(project-switcher-project) ${project?.name ?? vscode.workspace.name ?? "Project"}`;
    this.projectItem.show();

  }

  dispose(): void {
    this.projectItem.dispose();
    for (const subscription of this.subscriptions) {
      subscription.dispose();
    }
  }
}

function samePath(left: string, right: string | undefined): boolean {
  if (!right) {
    return false;
  }
  return process.platform === "linux"
    ? left === right
    : left.toLocaleLowerCase() === right.toLocaleLowerCase();
}
