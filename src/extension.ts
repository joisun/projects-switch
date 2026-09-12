import * as vscode from "vscode";
import { getProjectScanConfig } from "./config";
import { BranchPicker } from "./git/branchPicker";
import { GitService } from "./git/gitService";
import { SearchablePickerController } from "./picker/searchablePicker";
import { GitProjectResolver } from "./projects/gitProjectResolver";
import { ProjectPicker } from "./projects/picker";
import { ProjectScanner } from "./projects/scanner";
import { ProjectService } from "./projects/service";
import { ProjectStore } from "./projects/store";
import { ContextStatusBar } from "./statusBar";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const output = vscode.window.createOutputChannel("DevHop", { log: true });
  const pickerController = new SearchablePickerController();
  const resolver = new GitProjectResolver();
  const projects = new ProjectService(
    new ProjectStore(context.globalState),
    new ProjectScanner(),
    resolver,
    output,
  );
  const git = new GitService();
  const projectPicker = new ProjectPicker(projects, pickerController);
  const branchPicker = new BranchPicker(git, projects, pickerController);

  await Promise.all([git.initialize(), projects.registerCurrentProject()]);
  const statusBar = new ContextStatusBar(projects, git);

  context.subscriptions.push(
    output,
    pickerController,
    projects,
    git,
    statusBar,
    vscode.commands.registerCommand("projectSwitcher.switchProject", () => projectPicker.show()),
    vscode.commands.registerCommand("projectSwitcher.switchBranch", () => branchPicker.show()),
    vscode.commands.registerCommand("projectSwitcher.refreshProjects", async () => {
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "正在扫描 Git 项目…" },
        () => projects.refresh(),
      );
    }),
    vscode.commands.registerCommand("projectSwitcher.addProject", async () => {
      const selected = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "添加 Git 项目",
      });
      if (!selected?.[0]) {
        return;
      }
      const project = await projects.recordVisit(selected[0].fsPath, true);
      if (!project) {
        void vscode.window.showWarningMessage("所选目录不是 Git 项目。");
      }
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("projectSwitcher.projects")) {
        void projects.refresh().catch((error) => output.error("项目扫描失败", error));
      }
    }),
  );

  if (getProjectScanConfig().scanOnStartup) {
    void projects.refresh().catch((error) => output.error("项目扫描失败", error));
  }
}

export function deactivate(): void {}
