import { getDb } from '../db/database.js';

const toBlock = (row, weekdays) => ({
  id: row.id,
  label: row.label,
  icon: row.icon,
  from: row.start_time,
  to: row.end_time,
  date: row.on_date || null,
  days: weekdays
});

async function saveWeekdays(busyId, days) {
  const db = getDb();
  await db.run('DELETE FROM busy_weekdays WHERE busy_id = ?', [busyId]);
  for (const d of days) {
    await db.run('INSERT INTO busy_weekdays (busy_id, weekday) VALUES (?, ?)', [busyId, d]);
  }
}

export const busyRepository = {
  async findAll() {
    const db = getDb();
    const [rows, days] = await Promise.all([
      db.all('SELECT * FROM busy_blocks ORDER BY start_time'),
      db.all('SELECT busy_id, weekday FROM busy_weekdays ORDER BY weekday')
    ]);
    return rows.map(r => toBlock(r, days.filter(d => d.busy_id === r.id).map(d => d.weekday)));
  },

  async create(block) {
    const { lastId } = await getDb().run(
      'INSERT INTO busy_blocks (label, icon, start_time, end_time, on_date) VALUES (?, ?, ?, ?, ?)',
      [block.label, block.icon, block.from, block.to, block.date || null]
    );
    await saveWeekdays(lastId, block.date ? [] : block.days);
    return lastId;
  },

  async update(id, block) {
    await getDb().run(
      'UPDATE busy_blocks SET label = ?, icon = ?, start_time = ?, end_time = ?, on_date = ? WHERE id = ?',
      [block.label, block.icon, block.from, block.to, block.date || null, id]
    );
    await saveWeekdays(id, block.date ? [] : block.days);
  },

  async remove(id) {
    await getDb().run('DELETE FROM busy_blocks WHERE id = ?', [id]);
  }
};
