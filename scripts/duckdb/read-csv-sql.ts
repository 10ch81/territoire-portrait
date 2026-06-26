function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

/** Chemin normalisé pour read_csv DuckDB (Windows inclus). */
export function normalizeCsvPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function sqlReadCsv(filePath: string, options: string): string {
  const path = escapeSqlString(normalizeCsvPath(filePath));
  return `read_csv('${path}', ${options})`;
}

/**
 * Expression SQL read_csv pour les exports INSEE / data.gouv (CSV point-virgule, guillemets).
 */
export function sqlReadSemicolonCsv(filePath: string): string {
  return sqlReadCsv(
    filePath,
    "delim=';', quote='\"', header=true, auto_detect=true, parallel=false",
  );
}

/** CSV comma-séparé (DVF legacy et récent). */
export function sqlReadCommaCsv(filePath: string): string {
  return sqlReadCsv(
    filePath,
    "delim=',', quote='\"', header=true, auto_detect=true, parallel=false",
  );
}

/** CSV point-virgule gzip (SSMSI commune). */
export function sqlReadGzSemicolonCsv(filePath: string): string {
  return sqlReadCsv(
    filePath,
    "delim=';', quote='\"', header=true, auto_detect=true, parallel=false, compression='gzip'",
  );
}

/** read_csv depuis une URL publique (DVF data.gouv). */
export function sqlReadCommaCsvUrl(url: string, header = true): string {
  const escaped = escapeSqlString(url);
  return `read_csv('${escaped}', delim=',', quote='\"', header=${header}, auto_detect=true, parallel=false)`;
}
