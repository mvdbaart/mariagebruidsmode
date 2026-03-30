export function normalizeSpecialisms(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((item) => String(item ?? '').trim())
      .filter(Boolean);
  }

  if (typeof input === 'string') {
    return input
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function parseSortOrder(input: unknown): number {
  const value = Number(input);
  return Number.isFinite(value) ? value : 0;
}
