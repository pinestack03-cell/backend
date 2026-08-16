export function trimRecordStrings<T extends object>(record: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    out[key] = typeof value === 'string' ? value.trim() : value;
  }
  return out as T;
}
