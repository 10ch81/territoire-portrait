import assert from "node:assert/strict";

export const GOLDEN_INSEE_CODES = ["35238", "44109", "75056", "13055"] as const;

export function assertCacheMatchesSample<T>(
  rebuilt: Record<string, T>,
  existing: Record<string, T>,
  label: string,
  sampleCodes: readonly string[] = GOLDEN_INSEE_CODES,
): void {
  assert.equal(
    Object.keys(rebuilt).length,
    Object.keys(existing).length,
    `${label} — nombre de communes indexées`,
  );

  for (const inseeCode of sampleCodes) {
    assert.deepEqual(
      rebuilt[inseeCode],
      existing[inseeCode],
      `${label} — entrée pour ${inseeCode}`,
    );
  }
}
