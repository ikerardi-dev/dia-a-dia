import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

const DB_NAME = 'diaadia';

/** Adaptador para el APK: SQLite real dentro del móvil */
export async function createNativeAdapter() {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  await sqlite.checkConnectionsConsistency().catch(() => {});

  const exists = (await sqlite.isConnection(DB_NAME, false)).result;
  const conn = exists
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  await conn.open();

  let inTransaction = false;

  const all = async (sql, params = []) => (await conn.query(sql, params)).values ?? [];

  return {
    all,
    get: async (sql, params = []) => (await all(sql, params))[0],
    run: async (sql, params = []) => {
      // transaction = false: las transacciones las controlamos nosotros
      const res = await conn.run(sql, params, false);
      return { changes: res.changes?.changes ?? 0, lastId: res.changes?.lastId ?? null };
    },
    exec: async sql => { await conn.execute(sql, false); },
    transaction: async fn => {
      if (inTransaction) return fn();
      inTransaction = true;
      await conn.beginTransaction();
      try {
        const result = await fn();
        await conn.commitTransaction();
        return result;
      } catch (err) {
        await conn.rollbackTransaction().catch(() => {});
        throw err;
      } finally {
        inTransaction = false;
      }
    }
  };
}
