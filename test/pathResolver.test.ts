import { describe, expect, it } from "vitest";
import { resolveScanRoot } from "../src/projects/pathResolver";

describe("resolveScanRoot", () => {
  it("expands supported environment variable forms", () => {
    const environment = { WORKSPACE: "/workspace" };

    expect(resolveScanRoot("$WORKSPACE/backend", environment, "linux")).toEqual({
      ok: true,
      path: "/workspace/backend",
    });
    expect(resolveScanRoot("${WORKSPACE}/backend", environment, "linux")).toEqual({
      ok: true,
      path: "/workspace/backend",
    });
    expect(resolveScanRoot("${env:WORKSPACE}/backend", environment, "linux")).toEqual({
      ok: true,
      path: "/workspace/backend",
    });
    expect(resolveScanRoot("%WORKSPACE%/backend", environment, "linux")).toEqual({
      ok: true,
      path: "/workspace/backend",
    });
  });

  it("rejects missing variables, relative paths, and filesystem roots", () => {
    expect(resolveScanRoot("$MISSING/backend", {}, "linux")).toMatchObject({ ok: false });
    expect(resolveScanRoot("projects/backend", {}, "linux")).toMatchObject({ ok: false });
    expect(resolveScanRoot("/", {}, "linux")).toMatchObject({ ok: false });
  });

  it("does not recursively expand variables", () => {
    expect(
      resolveScanRoot("$WORKSPACE/backend", { WORKSPACE: "$HOME/code", HOME: "/home/me" }, "linux"),
    ).toMatchObject({ ok: false });
  });
});
