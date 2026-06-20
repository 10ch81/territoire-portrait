/**
 * Supprime récursivement les valeurs nulles, vides ou objets/tableaux vides.
 */
export function stripEmpty<T>(value: T): T | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : (trimmed as T);
  }

  if (Array.isArray(value)) {
    const filtered = value
      .map((item) => stripEmpty(item))
      .filter((item) => item !== undefined);
    return filtered.length === 0 ? undefined : (filtered as T);
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      const stripped = stripEmpty(entry);
      if (stripped !== undefined) {
        result[key] = stripped;
      }
    }
    return Object.keys(result).length === 0 ? undefined : (result as T);
  }

  return value;
}
