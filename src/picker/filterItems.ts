export interface FilterableItem {
  label: string;
  description?: string;
  detail?: string;
  searchText?: string;
}

export function filterItems<T extends FilterableItem>(items: readonly T[], query: string): T[] {
  function normalize(value: string): string {
    return value.trim().toLocaleLowerCase();
  }

  function isSubsequence(needle: string, candidate: string): boolean {
    let index = 0;
    for (const character of candidate) {
      if (character === needle[index]) index += 1;
      if (index === needle.length) return true;
    }
    return false;
  }

  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return [...items];
  }
  function rank(item: T): number {
    const name = normalize(item.label.replace(/^\$\([^)]+\)\s*/, ""));
    if (name === normalizedQuery) return 0;
    if (name.startsWith(normalizedQuery)) return 1;
    if (name.includes(normalizedQuery)) return 2;
    if (isSubsequence(normalizedQuery, name)) return 3;
    const fields = [item.detail, item.searchText, item.description]
      .filter((value): value is string => Boolean(value))
      .map(normalize);
    if (fields.some((value) => value.includes(normalizedQuery))) return 4;
    if (fields.some((value) => isSubsequence(normalizedQuery, value))) return 5;
    return Infinity;
  }

  return items
    .map((item, index) => ({ item, index, rank: rank(item) }))
    .filter((entry) => Number.isFinite(entry.rank))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map((entry) => entry.item);
}
