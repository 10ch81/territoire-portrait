import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";

/**
 * Session DuckDB éphémère pour les scripts d'ingestion (hors runtime Next.js).
 */
export async function withDuckDbSession<T>(
  fn: (connection: DuckDBConnection) => Promise<T>,
): Promise<T> {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();

  try {
    return await fn(connection);
  } finally {
    connection.closeSync();
    instance.closeSync();
  }
}
