import * as path from "node:path";
import * as vscode from "vscode";
import type { SearchableItem } from "../picker/searchablePicker";
import { SearchablePickerController } from "../picker/searchablePicker";
import { RefType, type Ref, type Repository, type Worktree } from "../types/git";
import { ProjectService } from "../projects/service";
import { GitService } from "./gitService";

interface BranchItem extends SearchableItem {
  ref: Ref;
  remote: boolean;
  worktree?: Worktree;
  current: boolean;
}

export class BranchPicker {
  constructor(
    private readonly git: GitService,
    private readonly projects: ProjectService,
    private readonly picker: SearchablePickerController,
  ) {}

  async show(): Promise<void> {
    const repository = this.git.getCurrentRepository();
    if (!repository) {
      void vscode.window.showInformationMessage("当前项目不是 Git 仓库。");
      return;
    }

    const [localRefs, remoteRefs] = await Promise.all([
      repository.getBranches({ remote: false, sort: "committerdate" }),
      repository.getBranches({ remote: true, sort: "committerdate" }),
    ]);
    const currentBranch = repository.state.HEAD?.name;
    const items = [
      ...localRefs
        .filter(hasName)
        .map((ref) => this.toItem(ref, false, repository, currentBranch)),
      ...remoteRefs
        .filter(hasName)
        .filter((ref) => !ref.name.endsWith("/HEAD"))
        .map((ref) => this.toItem(ref, true, repository, currentBranch)),
    ].sort((left, right) => Number(right.current) - Number(left.current));

    const selected = await this.picker.show(items, {
      title: "DevHop: Switch Branch",
      placeholder: "搜索 branch；已绑定 worktree 的 branch 会打开对应目录",
    });
    if (!selected || selected.current) {
      return;
    }

    if (selected.worktree && !samePath(selected.worktree.path, repository.rootUri.fsPath)) {
      await this.openWorktree(selected.ref.name!, selected.worktree.path);
      return;
    }

    try {
      if (selected.remote) {
        const localName = selected.ref.name!.replace(/^[^/]+\//, "");
        const conflicts = localRefs.some((ref) => ref.name === localName);
        if (conflicts) {
          void vscode.window.showWarningMessage(
            `本地 branch “${localName}” 已存在，请选择对应的本地 branch。`,
          );
          return;
        }
        await repository.createBranch(localName, true, selected.ref.name);
      } else {
        await vscode.commands.executeCommand("git.checkout", repository, selected.ref.name);
      }
    } catch (error) {
      void vscode.window.showErrorMessage(`切换 branch 失败：${formatError(error)}`);
    }
  }

  private toItem(
    ref: Ref,
    remote: boolean,
    repository: Repository,
    currentBranch: string | undefined,
  ): BranchItem {
    const current = !remote && ref.name === currentBranch;
    const worktree = !remote
      ? repository.state.worktrees.find((item) => normalizeWorktreeRef(item.ref) === ref.name)
      : undefined;
    const description = current
      ? "当前 branch"
      : worktree
        ? `worktree: ${worktree.name}`
        : remote
          ? "Remote"
          : undefined;

    return {
      label: `${current ? "$(check)" : remote ? "$(cloud)" : "$(git-branch)"} ${ref.name}`,
      description,
      detail: worktree?.path,
      searchText: worktree?.name,
      ref,
      remote,
      worktree,
      current,
    };
  }

  private async openWorktree(branch: string, worktreePath: string): Promise<void> {
    const currentWindow = "在当前窗口打开";
    const newWindow = "在新窗口打开";
    const choice = await vscode.window.showWarningMessage(
      `Branch “${branch}” 已在 worktree “${worktreePath}” 中打开。`,
      { modal: true },
      currentWindow,
      newWindow,
    );
    if (!choice) {
      return;
    }
    await this.projects.recordVisit(worktreePath);
    await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(worktreePath), {
      forceReuseWindow: choice === currentWindow,
      forceNewWindow: choice === newWindow,
    });
  }
}

function hasName(ref: Ref): ref is Ref & { name: string } {
  return Boolean(ref.name) && (ref.type === RefType.Head || ref.type === RefType.RemoteHead);
}

function normalizeWorktreeRef(ref: string): string {
  return ref.replace(/^refs\/heads\//, "");
}

function samePath(left: string, right: string): boolean {
  const normalize = (value: string) => {
    const normalized = path.normalize(value);
    return process.platform === "linux" ? normalized : normalized.toLocaleLowerCase();
  };
  return normalize(left) === normalize(right);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
