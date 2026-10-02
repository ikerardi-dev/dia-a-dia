/**
 * Esquema de la base de datos SQLite.
 * Cada migración se aplica una sola vez y en orden. Para cambiar el esquema
 * en el futuro, añade una migración nueva (2, 3...) y sube SCHEMA_VERSION.
 */
export const SCHEMA_VERSION = 3;

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
  `,

  /**
   * v2: nuevos tipos de tarea ('once' = una sola vez, 'anytime' = sin fecha)
   * y fecha en la que se completó una tarea sin fecha.
   * SQLite no permite cambiar un CHECK, así que se rehace la tabla copiando los datos.
   */
  2: `
    CREATE TABLE tasks_new (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      icon         TEXT    NOT NULL,
      points       INTEGER NOT NULL CHECK (points > 0),
      freq_type    TEXT    NOT NULL
                   CHECK (freq_type IN ('daily', 'interval', 'weekdays', 'once', 'anytime')),
      freq_every   INTEGER CHECK (freq_every IS NULL OR freq_every >= 2),
      pref         TEXT    NOT NULL DEFAULT 'cualquiera'
                   CHECK (pref IN ('manana', 'tarde', 'noche', 'cualquiera')),
      fixed_time   TEXT,
      duration     INTEGER NOT NULL DEFAULT 30 CHECK (duration > 0),
      start_date   TEXT    NOT NULL,
      completed_at TEXT,
      deleted      INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    INSERT INTO tasks_new (id, name, icon, points, freq_type, freq_every, pref,
                           fixed_time, duration, start_date, deleted, created_at)
    SELECT id, name, icon, points, freq_type, freq_every, pref,
           fixed_time, duration, start_date, deleted, created_at
    FROM tasks;

    DROP TABLE tasks;
    ALTER TABLE tasks_new RENAME TO tasks;
  `,

  /**
   * v3: eventos (aviso previo y envío al calendario del móvil), borrado lógico
   * del horario ocupado, enlace de tareas con el calendario del móvil y
   * tareas movidas automáticamente por el límite diario.
   */
  3: `
    ALTER TABLE busy_blocks ADD COLUMN reminder_min INTEGER;
    ALTER TABLE busy_blocks ADD COLUMN sync_calendar INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE busy_blocks ADD COLUMN calendar_event_id TEXT;
    ALTER TABLE busy_blocks ADD COLUMN calendar_hash TEXT;
    ALTER TABLE busy_blocks ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;

    ALTER TABLE tasks ADD COLUMN sync_calendar INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE tasks ADD COLUMN calendar_event_id TEXT;
    ALTER TABLE tasks ADD COLUMN calendar_hash TEXT;

    ALTER TABLE task_instances ADD COLUMN moved_to TEXT;
    ALTER TABLE task_instances ADD COLUMN auto_moved INTEGER NOT NULL DEFAULT 0;
  `
};
