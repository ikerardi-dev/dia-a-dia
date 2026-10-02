import { getDb } from '../db/database.js';

const toBlock = (row, weekdays) => ({
  id: row.id,
  label: row.label,
  icon: row.icon,
  from: row.start_time,
  to: row.end_time,
  date: row.on_date || null,
  days: weekdays,
  reminder: row.reminder_min ?? null,
  syncCalendar: !!row.sync_calendar,
  calendarEventId: row.calendar_event_id || null,
  calendarHash: row.calendar_hash || null,
  deleted: !!row.deleted
});

async function saveWeekdays(busyId, days) {
  const db = getDb();
  await db.run('DELETE FROM busy_weekdays WHERE busy_id = ?', [busyId]);
  for (const d of days) {
    await db.run('INSERT INTO busy_weekdays (busy_id, weekday) VALUES (?, ?)', [busyId, d]);
  }
}

export const busyRepository = {
  async findAll({ includeDeleted = false } = {}) {
    const db = getDb();
    const [rows, days] = await Promise.all([
      db.all(`SELECT * FROM busy_blocks ${includeDeleted ? '' : 'WHERE deleted = 0'} ORDER BY on_date, start_time`),
      db.all('SELECT busy_id, weekday FROM busy_weekdays ORDER BY weekday')
    ]);
    return rows.map(r => toBlock(r, days.filter(d => d.busy_id === r.id).map(d => d.weekday)));
  },

  async findById(id) {
    const row = await getDb().get('SELECT * FROM busy_blocks WHERE id = ?', [id]);
    if (!row) return null;
    const days = await getDb().all('SELECT weekday FROM busy_weekdays WHERE busy_id = ? ORDER BY weekday', [id]);
    return toBlock(row, days.map(d => d.weekday));
  },

  async create(block) {
    const { lastId } = await getDb().run(
      `INSERT INTO busy_blocks (label, icon, start_time, end_time, on_date, reminder_min, sync_calendar)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [block.label, block.icon, block.from, block.to, block.date || null, block.reminder, block.syncCalendar ? 1 : 0]
    );
    await saveWeekdays(lastId, block.date ? [] : block.days);
    return lastId;
  },

  async update(id, block) {
    await getDb().run(
      `UPDATE busy_blocks SET label = ?, icon = ?, start_time = ?, end_time = ?, on_date = ?,
              reminder_min = ?, sync_calendar = ?
       WHERE id = ?`,
      [block.label, block.icon, block.from, block.to, block.date || null, block.reminder, block.syncCalendar ? 1 : 0, id]
    );
    await saveWeekdays(id, block.date ? [] : block.days);
  },

  /** Borrado lógico: así se puede quitar después del calendario del móvil */
  async softDelete(id) {
    await getDb().run('UPDATE busy_blocks SET deleted = 1 WHERE id = ?', [id]);
  },

  async setCalendarLink(id, eventId, hash) {
    await getDb().run('UPDATE busy_blocks SET calendar_event_id = ?, calendar_hash = ? WHERE id = ?', [eventId, hash, id]);
  }
};
