import { describe, expect, it } from "vitest";
import { filterItems } from "../src/picker/filterItems";

describe("filterItems", () => {
  const items = [
    { label: "project-switcher", detail: "/code/tools/project-switcher" },
    { label: "admin-web", detail: "/code/company/admin-web" },
  ];

  it("matches fuzzy label text and paths", () => {
    expect(filterItems(items, "psw")).toEqual([items[0]]);
    expect(filterItems(items, "company")).toEqual([items[1]]);
  });

  it("ranks exact, prefix, substring and fuzzy names ahead of paths", () => {
    const candidates = [
      { label: ".toolkit", detail: "/workspace/sample-project/.toolkit" },
      { label: "s-a-m-p-l-e" },
      { label: "tools-sample" },
      { label: "sample-punisher" },
      { label: "$(folder) sample" },
    ];
    expect(filterItems(candidates, " SAMPLE ")).toEqual([...candidates].reverse());
  });

  it("puts punisher ahead of incidental fuzzy path matches", () => {
    const candidates = [
      { label: "other", detail: "/p/u/n/i/s/h/e/r" },
      { label: "sample-punisher", detail: "/workspace/sample-punisher" },
    ];
    expect(filterItems(candidates, "punisher")[0]).toBe(candidates[1]);
    expect(filterItems(candidates, candidates[1].detail)).toEqual([candidates[1]]);
  });

  it("does not join fields to produce a match", () => {
    expect(filterItems([{ label: "pun", detail: "ish", searchText: "er" }], "punisher")).toEqual([]);
  });

  it("preserves recency order for ties and empty queries without mutating the input", () => {
    const candidates = [{ label: "sample-z" }, { label: "sample-a" }];
    expect(filterItems(candidates, "sample")).toEqual(candidates);
    expect(filterItems(candidates, "  ")).toEqual(candidates);
    expect(candidates.map((item) => item.label)).toEqual(["sample-z", "sample-a"]);
  });

  it("preserves item identity when reordering results", () => {
    const candidates = [{ label: "tools-punisher", index: 8 }, { label: "punisher", index: 12 }];
    const result = filterItems(candidates, "punisher");
    expect(result[0]).toBe(candidates[1]);
    expect(result[1]).toBe(candidates[0]);
  });
});
