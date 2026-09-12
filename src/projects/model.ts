export interface WorktreeRecord {
  path: string;
  branch?: string;
  detached: boolean;
  main: boolean;
}

export interface ProjectRecord {
  id: string;
  name: string;
  rootPath: string;
  lastPath: string;
  worktrees: WorktreeRecord[];
  lastVisitedAt?: number;
  scanned: boolean;
  manual: boolean;
}

export interface StoredProjectState {
  version: 1;
  projects: ProjectRecord[];
}
