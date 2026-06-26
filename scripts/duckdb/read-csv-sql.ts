function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

/** Chemin normalisé pour read_csv DuckDB (Windows inclus). */
export function normalizeCsvPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

/**
 * Expression SQL read_csv pour les exports INSEE / data.gouv (CSV point-virgule, guillemets).
 */
export function sqlReadSemicolonCsv(filePath: string): string {
  const path = escapeSqlString(normalizeCsvPath(filePath));
  return `read_csv('${path}', delim=';', quote='"', header=true, auto_detect=true, parallel=false)`;
}
