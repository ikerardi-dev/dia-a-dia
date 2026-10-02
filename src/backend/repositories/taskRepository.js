import { getDb } from '../db/database.js';

const toTask = (row, weekdays) => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  points: row.points,
  freq: {
    type: row.freq_type,
    every: row.freq_every,
    days: weekdays
  },
  pref: row.pref,
  time: row.fixed_time || '',
  duration: row.duration,
  startDate: row.start_date,
  deleted: !!row.deleted
});

async function weekdaysByTask() {
  const rows = await getDb().all('SELECT task_id, weekday FROM task_weekdays ORDER BY weekday');
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.task_id)) map.set(r.task_id, []);
    map.get(r.task_id).push(r.weekday);
  }
  return map;
}

async function saveWeekdays(taskId, days) {
  const db = getDb();
  await db.run('DELETE FROM task_weekdays WHERE task_id = ?', [taskId]);
  for (const d of days) {
    await db.run('INSERT INTO task_weekdays (task_id, weekday) VALUES (?, ?)', [taskId, d]);
  }
}

export const taskRepository = {
  async findAll({ includeDeleted = false } = {}) {
    const sql = includeDeleted
      ? 'SELECT * FROM tasks ORDER BY id'
      : 'SELECT * FROM tasks WHERE deleted = 0 ORDER BY id';
    const [rows, days] = await Promise.all([getDb().all(sql), weekdaysByTask()]);
    return rows.map(r => toTask(r, days.get(r.id) || []));
  },

  async findById(id) {
    const row = await getDb().get('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!row) return null;
    const days = await getDb().all('SELECT weekday FROM task_weekdays WHERE task_id = ? ORDER BY weekday', [id]);
    return toTask(row, days.map(d => d.weekday));
  },

  async create(task) {
    const { lastId } = await getDb().run(
      `INSERT INTO tasks (name, icon, points, freq_type, freq_every, pref, fixed_time, duration, start_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.name, task.icon, task.points, task.freq.type,
        task.freq.type === 'interval' ? task.freq.every : null,
        task.pref, task.time || null, task.duration, task.startDate
      ]
    );
    if (task.freq.type === 'weekdays') await saveWeekdays(lastId, task.freq.days);
    return lastId;
  },

  async update(id, task) {
    await getDb().run(
      `UPDATE tasks SET name = ?, icon = ?, points = ?, freq_type = ?, freq_every = ?,
              pref = ?, fixed_time = ?, duration = ?
       WHERE id = ?`,
      [
        task.name, task.icon, task.points, task.freq.type,
        task.freq.type === 'interval' ? task.freq.every : null,
        task.pref, task.time || null, task.duration, id
      ]
    );
    await saveWeekdays(id, task.freq.type === 'weekdays' ? task.freq.days : []);
  },

  /** Borrado lógico: la tarea desaparece pero su historial se conserva */
  async softDelete(id) {
    await getDb().run('UPDATE tasks SET deleted = 1 WHERE id = ?', [id]);
  }
};
