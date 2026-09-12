import * as path from "node:path";

const variablePattern = /\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}|\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)|%([A-Za-z_][A-Za-z0-9_]*)%/g;

export type ScanRootResolution =
  | { ok: true; path: string }
  | { ok: false; reason: string };

export function resolveScanRoot(
  input: string,
  environment: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): ScanRootResolution {
  const value = input.trim();
  if (!value) {
    return { ok: false, reason: "路径为空" };
  }

  let missingVariable: string | undefined;
  const expanded = value.replace(
    variablePattern,
    (_match, envName?: string, bracedName?: string, plainName?: string, windowsName?: string) => {
      const name = envName ?? bracedName ?? plainName ?? windowsName;
      if (!name) {
        return _match;
      }
      const resolved = environment[name];
      if (resolved === undefined) {
        missingVariable = name;
        return _match;
      }
      return resolved;
    },
  );

  if (missingVariable) {
    return { ok: false, reason: `环境变量 ${missingVariable} 未定义` };
  }

  const implementation = platform === "win32" ? path.win32 : path.posix;
  if (!implementation.isAbsolute(expanded)) {
    return { ok: false, reason: "变量展开后不是绝对路径" };
  }

  const normalized = implementation.normalize(expanded);
  if (normalized === implementation.parse(normalized).root) {
    return { ok: false, reason: "不允许扫描文件系统根目录" };
  }

  return { ok: true, path: normalized };
}
