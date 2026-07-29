import { PoolClient } from 'pg';
import { pgPool } from './pg.client';

export type TenantDbHelper = <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>;

/**
 * Executes a database operation within a single checked-out PoolClient,
 * scoped inside an explicit transaction with SET LOCAL search_path TO "<schemaName>", public.
 */
export async function withTenantConnection<T>(
  schemaName: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    // Set local search path for this exact connection
    await client.query(`SET LOCAL search_path TO "${schemaName}", public`);

    const result = await fn(client);

    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
