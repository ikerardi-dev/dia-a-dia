import { getDb } from '../db/database.js';

const toInstance = row => row && ({
  id: row.id,
  taskId: row.task_id,
  date: row.date,
  status: row.status,
  carried: row.carried,
  fromDate: row.from_date || null,
  notBefore: row.not_before ?? null,
  doneAt: row.done_at || null,
  movedTo: row.moved_to || null,
  pinnedStart: row.pinned_start ?? null,
  autoMoved: !!row.auto_moved
});

export const instanceRepository = {
  async findById(id) {
    return toInstance(await getDb().get('SELECT * FROM task_instances WHERE id = ?', [id]));
  },

  async findByDate(date) {
    const rows = await getDb().all('SELECT * FROM task_instances WHERE date = ? ORDER BY id', [date]);
    return rows.map(toInstance);
  },

  async findBetween(from, to) {
    const rows = await getDb().all(
      'SELECT * FROM task_instances WHERE date BETWEEN ? AND ? ORDER BY date, id',
      [from, to]
    );
    return rows.map(toInstance);
  },

  async create({ taskId, date, carried = 0, fromDate = null, autoMoved = false }) {
    const { lastId } = await getDb().run(
      'INSERT INTO task_instances (task_id, date, carried, from_date, auto_moved) VALUES (?, ?, ?, ?, ?)',
      [taskId, date, carried, fromDate, autoMoved ? 1 : 0]
    );
    return lastId;
  },

  /** Marca la instancia como movida a otro día (a mano o por el límite diario) */
  async markMoved(id, movedTo, auto = false) {
    await getDb().run(
      "UPDATE task_instances SET status = 'moved', moved_to = ?, auto_moved = ? WHERE id = ?",
      [movedTo, auto ? 1 : 0, id]
    );
  },

  /** ¿Hay ya alguna instancia (no movida) de esta tarea ese día? */
  async existsOn(taskId, date) {
    const row = await getDb().get(
      "SELECT 1 AS x FROM task_instances WHERE task_id = ? AND date = ? AND status != 'moved'",
      [taskId, date]
    );
    return !!row;
  },

  /** ¿Existe ya la instancia "normal" (no arrastrada) de esta tarea ese día? */
  async hasRegular(taskId, date) {
    const row = await getDb().get(
      'SELECT 1 AS x FROM task_instances WHERE task_id = ? AND date = ? AND carried = 0',
      [taskId, date]
    );
    return !!row;
  },

  async setStatus(id, status, doneAt = null) {
    await getDb().run('UPDATE task_instances SET status = ?, done_at = ? WHERE id = ?', [status, doneAt, id]);
  },

  async setStatusForDate(date, fromStatus, toStatus) {
    await getDb().run(
      'UPDATE task_instances SET status = ? WHERE date = ? AND status = ?',
      [toStatus, date, fromStatus]
    );
  },

  async remove(id) {
    await getDb().run('DELETE FROM task_instances WHERE id = ?', [id]);
  },

  /** Hora fijada a mano (minutos desde las 00:00), o null para volver a la automática */
  async setPinnedStart(id, minutes) {
    await getDb().run('UPDATE task_instances SET pinned_start = ?, not_before = NULL WHERE id = ?', [minutes, id]);
  },

  async excusePendingCarried(taskId, date) {
    await getDb().run(
      "UPDATE task_instances SET status = 'excused' WHERE task_id = ? AND date = ? AND carried > 0 AND status = 'pending'",
      [taskId, date]
    );
  },

  async setNotBefore(id, minutes) {
    await getDb().run('UPDATE task_instances SET not_before = ? WHERE id = ?', [minutes, id]);
  },

  async deletePendingRegular(taskId, date) {
    await getDb().run(
      "DELETE FROM task_instances WHERE task_id = ? AND date = ? AND carried = 0 AND status = 'pending'",
      [taskId, date]
    );
  },

  async deletePendingFrom(taskId, fromDate) {
    await getDb().run(
      "DELETE FROM task_instances WHERE task_id = ? AND date >= ? AND status = 'pending'",
      [taskId, fromDate]
    );
  },

  /** Tareas con alguna instancia pendiente desde una fecha */
  async pendingTaskIds(fromDate) {
    const rows = await getDb().all(
      "SELECT DISTINCT task_id AS id FROM task_instances WHERE status = 'pending' AND date >= ?",
      [fromDate]
    );
    return new Set(rows.map(r => r.id));
  },

  /** Veces que se ha completado cada tarea (para la medalla de constancia) */
  async countDoneByTask() {
    return getDb().all(
      "SELECT task_id AS taskId, COUNT(*) AS n FROM task_instances WHERE status = 'done' GROUP BY task_id"
    );
  }
};
