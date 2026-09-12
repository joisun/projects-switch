import * as vscode from "vscode";
import type {
  GitApi,
  GitExtension,
  GitExtensionHandle,
  Repository,
} from "../types/git";

export class GitService implements vscode.Disposable {
  private readonly changes = new vscode.EventEmitter<void>();
  private readonly repositorySubscriptions: vscode.Disposable[] = [];
  private readonly apiSubscriptions: vscode.Disposable[] = [];
  private api: GitApi | undefined;

  readonly onDidChange = this.changes.event;

  async initialize(): Promise<void> {
    const extension = vscode.extensions.getExtension<GitExtension>("vscode.git") as
      | GitExtensionHandle
      | undefined;
    if (!extension) {
      return;
    }
    const exports = extension.isActive ? extension.exports : await extension.activate();
    if (!exports.enabled) {
      return;
    }
    this.api = exports.getAPI(1);
    this.attachRepositoryListeners();
    this.apiSubscriptions.push(
      this.api.onDidOpenRepository(() => this.attachRepositoryListeners()),
      this.api.onDidCloseRepository(() => this.attachRepositoryListeners()),
    );
  }

  getCurrentRepository(): Repository | undefined {
    const api = this.api;
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!api || !folder) {
      return undefined;
    }
    return api.getRepository(folder.uri) ?? api.repositories.find((repository) =>
      folder.uri.fsPath.startsWith(repository.rootUri.fsPath),
    );
  }

  private attachRepositoryListeners(): void {
    while (this.repositorySubscriptions.length > 0) {
      this.repositorySubscriptions.pop()?.dispose();
    }
    for (const repository of this.api?.repositories ?? []) {
      this.repositorySubscriptions.push(
        repository.state.onDidChange(() => this.changes.fire()),
        repository.onDidCheckout(() => this.changes.fire()),
      );
    }
    this.changes.fire();
  }

  dispose(): void {
    for (const disposable of this.repositorySubscriptions) {
      disposable.dispose();
    }
    for (const disposable of this.apiSubscriptions) {
      disposable.dispose();
    }
    this.changes.dispose();
  }
}
