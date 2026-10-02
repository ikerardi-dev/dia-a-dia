/**
 * Esquema de la base de datos SQLite.
 * Cada migración se aplica una sola vez y en orden. Para cambiar el esquema
 * en el futuro, añade una migración nueva (2, 3...) y sube SCHEMA_VERSION.
 */
export const SCHEMA_VERSION = 1;

export const MIGRATIONS = {
  1: `
    CREATE TABLE settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      icon        TEXT    NOT NULL,
      points      INTEGER NOT NULL CHECK (points > 0),
      freq_type   TEXT    NOT NULL CHECK (freq_type IN ('daily', 'interval', 'weekdays')),
      freq_every  INTEGER CHECK (freq_every IS NULL OR freq_every >= 2),
      pref        TEXT    NOT NULL DEFAULT 'cualquiera'
                  CHECK (pref IN ('manana', 'tarde', 'noche', 'cualquiera')),
      fixed_time  TEXT,
      duration    INTEGER NOT NULL DEFAULT 30 CHECK (duration > 0),
      start_date  TEXT    NOT NULL,
      deleted     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE task_weekdays (
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
      PRIMARY KEY (task_id, weekday)
    );

    CREATE TABLE busy_blocks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      label      TEXT NOT NULL,
      icon       TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time   TEXT NOT NULL,
      on_date    TEXT,
      CHECK (end_time > start_time)
    );

    CREATE TABLE busy_weekdays (
      busy_id INTEGER NOT NULL REFERENCES busy_blocks(id) ON DELETE CASCADE,
      weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
      PRIMARY KEY (busy_id, weekday)
    );

    CREATE TABLE days (
      date      TEXT PRIMARY KEY,
      generated INTEGER NOT NULL DEFAULT 0,
      closed    INTEGER NOT NULL DEFAULT 0,
      wildcard  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE task_instances (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id    INTEGER NOT NULL REFERENCES tasks(id),
      date       TEXT    NOT NULL REFERENCES days(date),
      status     TEXT    NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'done', 'missed', 'moved', 'excused')),
      carried    INTEGER NOT NULL DEFAULT 0,
      from_date  TEXT,
      not_before INTEGER,
      done_at    TEXT
    );
    CREATE INDEX idx_instances_date ON task_instances(date);
    CREATE INDEX idx_instances_task ON task_instances(task_id);

    CREATE TABLE rewards (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      name    TEXT    NOT NULL,
      icon    TEXT    NOT NULL,
      cost    INTEGER NOT NULL CHECK (cost > 0),
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE points_ledger (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT    NOT NULL,
      amount      INTEGER NOT NULL,
      kind        TEXT    NOT NULL CHECK (kind IN ('task_done', 'task_missed', 'reward', 'adjust')),
      instance_id INTEGER REFERENCES task_instances(id) ON DELETE CASCADE,
      reward_id   INTEGER REFERENCES rewards(id),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX idx_ledger_date ON points_ledger(date);
  `
};
