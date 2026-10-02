import { MIGRATIONS, SCHEMA_VERSION } from './schema.js';

/**
 * Un "adaptador" es cualquier objeto con esta forma:
 *   all(sql, params)  -> Promise<filas[]>
 *   get(sql, params)  -> Promise<fila | undefined>
 *   run(sql, params)  -> Promise<{ changes, lastId }>
 *   exec(sql)         -> Promise<void>   (varias sentencias)
 *   transaction(fn)   -> Promise<resultado de fn>
 * Así el resto del backend no sabe si corre en Android o en el navegador.
 */
let db = null;

export async function initDatabase(adapter) {
  db = adapter;
  await db.exec('PRAGMA foreign_keys = ON;');
  await db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);');

  let row = await db.get('SELECT version FROM schema_version');
  if (!row) {
    await db.run('INSERT INTO schema_version (version) VALUES (0)');
    row = { version: 0 };
  }

  for (let v = row.version + 1; v <= SCHEMA_VERSION; v++) {
    await db.transaction(async () => {
      await db.exec(MIGRATIONS[v]);
      await db.run('UPDATE schema_version SET version = ?', [v]);
    });
  }
}

export function getDb() {
  if (!db) throw new Error('La base de datos no está inicializada. Llama antes a api.init().');
  return db;
}
