import * as vscode from "vscode";

export interface ProjectScanConfig {
  scanRoots: string[];
  excludes: string[];
  maxDepth: number;
  scanOnStartup: boolean;
}

export function getProjectScanConfig(): ProjectScanConfig {
  const config = vscode.workspace.getConfiguration("projectsSwitch.projects");

  return {
    scanRoots: config.get<string[]>("scanRoots", []),
    excludes: config.get<string[]>("excludes", []),
    maxDepth: config.get<number>("maxDepth", 4),
    scanOnStartup: config.get<boolean>("scanOnStartup", true),
  };
}
