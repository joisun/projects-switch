import * as vscode from "vscode";
import type { SearchableItem } from "../picker/searchablePicker";
import { SearchablePickerController } from "../picker/searchablePicker";
import type { ProjectRecord } from "./model";
import { ProjectService } from "./service";

interface ProjectItem extends SearchableItem {
  project: ProjectRecord;
}

export class ProjectPicker {
  constructor(
    private readonly projects: ProjectService,
    private readonly picker: SearchablePickerController,
  ) {}

  async show(): Promise<void> {
    const currentPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const items = this.projects.getProjects().map<ProjectItem>((project) => ({
      label: `${isCurrentProject(project, currentPath) ? "$(check)" : "$(folder)"} ${project.name}`,
      description: formatVisitedAt(project.lastVisitedAt),
      detail: project.lastPath,
      searchText: project.rootPath,
      project,
    }));

    if (items.length === 0) {
      void vscode.window.showInformationMessage(
        "没有可切换的项目。请配置 projectsSwitch.projects.scanRoots 或添加项目。",
      );
      return;
    }

    const selected = await this.picker.show(items, {
      title: "Projects Switch: Switch Project",
      placeholder: "搜索项目名称或路径",
    });
    if (!selected) {
      return;
    }

    await this.projects.recordVisit(selected.project.lastPath);
    if (!isCurrentProject(selected.project, currentPath)) {
      await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(selected.project.lastPath));
    }
  }
}

function isCurrentProject(project: ProjectRecord, currentPath: string | undefined): boolean {
  if (!currentPath) {
    return false;
  }
  return project.worktrees.some((worktree) => samePath(worktree.path, currentPath));
}

function samePath(left: string, right: string): boolean {
  return process.platform === "linux"
    ? left === right
    : left.toLocaleLowerCase() === right.toLocaleLowerCase();
}

function formatVisitedAt(timestamp: number | undefined): string {
  if (!timestamp) {
    return "未访问";
  }
  const elapsed = Date.now() - timestamp;
  if (elapsed < 60_000) {
    return "刚刚";
  }
  if (elapsed < 3_600_000) {
    return `${Math.floor(elapsed / 60_000)} 分钟前`;
  }
  if (elapsed < 86_400_000) {
    return `${Math.floor(elapsed / 3_600_000)} 小时前`;
  }
  return `${Math.floor(elapsed / 86_400_000)} 天前`;
}
