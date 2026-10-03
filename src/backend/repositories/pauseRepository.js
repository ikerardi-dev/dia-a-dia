import { getDb } from '../db/database.js';

export const pauseRepository = {
  async findAll() {
    const db = getDb();
    const [rows, links] = await Promise.all([
      db.all('SELECT * FROM pauses ORDER BY start_date'),
      db.all('SELECT pause_id, task_id FROM pause_tasks')
    ]);
    return rows.map(r => ({
      id: r.id,
      label: r.label,
      from: r.start_date,
      to: r.end_date,
      taskIds: links.filter(l => l.pause_id === r.id).map(l => l.task_id)
    }));
  },

  async findById(id) {
    return (await this.findAll()).find(p => p.id === id) ?? null;
  },

  async create({ label, from, to, taskIds }) {
    const { lastId } = await getDb().run(
      'INSERT INTO pauses (label, start_date, end_date) VALUES (?, ?, ?)', [label, from, to]
    );
    await this.setTasks(lastId, taskIds);
    return lastId;
  },

  async update(id, { label, from, to, taskIds }) {
    await getDb().run('UPDATE pauses SET label = ?, start_date = ?, end_date = ? WHERE id = ?', [label, from, to, id]);
    await this.setTasks(id, taskIds);
  },

  async setTasks(id, taskIds) {
    const db = getDb();
    await db.run('DELETE FROM pause_tasks WHERE pause_id = ?', [id]);
    for (const taskId of taskIds) {
      await db.run('INSERT INTO pause_tasks (pause_id, task_id) VALUES (?, ?)', [id, taskId]);
    }
  },

  async remove(id) {
    await getDb().run('DELETE FROM pauses WHERE id = ?', [id]);
  }
};
