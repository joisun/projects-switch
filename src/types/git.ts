import type { Event, Extension, Uri } from "vscode";

export const enum RefType {
  Head,
  RemoteHead,
  Tag,
}

export interface Ref {
  readonly type: RefType;
  readonly name?: string;
  readonly commit?: string;
  readonly remote?: string;
}

export interface Branch extends Ref {
  readonly upstream?: {
    readonly remote: string;
    readonly name: string;
  };
}

export interface Worktree {
  readonly name: string;
  readonly path: string;
  readonly ref: string;
  readonly main: boolean;
  readonly detached: boolean;
}

export interface RepositoryState {
  readonly HEAD: Branch | undefined;
  readonly worktrees: readonly Worktree[];
  readonly onDidChange: Event<void>;
}

export interface Repository {
  readonly rootUri: Uri;
  readonly state: RepositoryState;
  readonly onDidCheckout: Event<void>;
  getBranches(query: {
    remote?: boolean;
    sort?: "alphabetically" | "committerdate" | "creatordate";
  }): Promise<Ref[]>;
  createBranch(name: string, checkout: boolean, ref?: string): Promise<void>;
}

export interface GitApi {
  readonly repositories: readonly Repository[];
  readonly onDidOpenRepository: Event<Repository>;
  readonly onDidCloseRepository: Event<Repository>;
  getRepository(uri: Uri): Repository | null;
}

export interface GitExtension {
  readonly enabled: boolean;
  getAPI(version: 1): GitApi;
}

export type GitExtensionHandle = Extension<GitExtension>;
