import * as vscode from "vscode";
import { GitService } from "./git/gitService";
import { ProjectService } from "./projects/service";

export class ContextStatusBar implements vscode.Disposable {
  private readonly projectItem = vscode.window.createStatusBarItem(
    "projectSwitcher.project",
    vscode.StatusBarAlignment.Left,
    1_000,
  );
  private readonly branchItem = vscode.window.createStatusBarItem(
    "projectSwitcher.branch",
    vscode.StatusBarAlignment.Left,
    999,
  );
  private readonly subscriptions: vscode.Disposable[];

  constructor(projects: ProjectService, git: GitService) {
    this.projectItem.name = "DevHop: Projects";
    this.projectItem.command = "projectSwitcher.switchProject";
    this.projectItem.tooltip = "切换 Project";

    this.branchItem.name = "DevHop: Branches";
    this.branchItem.command = "projectSwitcher.switchBranch";
    this.branchItem.tooltip = "切换 Branch；自动识别关联的 Worktree";

    this.subscriptions = [
      projects.onDidChange(() => this.refresh(projects, git)),
      git.onDidChange(() => this.refresh(projects, git)),
    ];
    this.refresh(projects, git);
  }

  refresh(projects: ProjectService, git: GitService): void {
    const currentPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const project = projects
      .getProjects()
      .find((candidate) =>
        candidate.worktrees.some((worktree) => samePath(worktree.path, currentPath)),
      );
    this.projectItem.text = `$(project-switcher-project) ${project?.name ?? vscode.workspace.name ?? "Project"}`;
    this.projectItem.show();

    const repository = git.getCurrentRepository();
    if (repository) {
      this.branchItem.text = `$(project-switcher-branch) ${repository.state.HEAD?.name ?? "HEAD"}`;
      this.branchItem.show();
    } else {
      this.branchItem.hide();
    }
  }

  dispose(): void {
    this.projectItem.dispose();
    this.branchItem.dispose();
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
