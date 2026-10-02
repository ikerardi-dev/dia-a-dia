/**
 * Adaptador sobre sql.js (SQLite compilado a WebAssembly).
 * Lo usan el modo navegador (npm run dev) y los tests de Node.
 */
export function createSqlJsAdapter(SQL, { data = null, onChange = null } = {}) {
  const db = data ? new SQL.Database(data) : new SQL.Database();
  let inTransaction = false;

  const all = (sql, params = []) => {
    const stmt = db.prepare(sql);
    try {
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows;
    } finally {
      stmt.free();
    }
  };

  const changed = () => {
    if (!inTransaction && onChange) onChange(db);
  };

  return {
    all: async (sql, params) => all(sql, params),
    get: async (sql, params) => all(sql, params)[0],
    run: async (sql, params = []) => {
      db.run(sql, params);
      const changes = db.getRowsModified();
      const lastId = all('SELECT last_insert_rowid() AS id')[0].id;
      changed();
      return { changes, lastId };
    },
    exec: async sql => {
      db.exec(sql);
      changed();
    },
    transaction: async fn => {
      if (inTransaction) return fn();
      inTransaction = true;
      db.exec('BEGIN');
      try {
        const result = await fn();
        db.exec('COMMIT');
        inTransaction = false;
        changed();
        return result;
      } catch (err) {
        db.exec('ROLLBACK');
        inTransaction = false;
        throw err;
      }
    }
  };
}
