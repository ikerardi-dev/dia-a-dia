import { getDb } from '../db/database.js';

export const pointsRepository = {
  async add({ date, amount, kind, instanceId = null, rewardId = null }) {
    const { lastId } = await getDb().run(
      'INSERT INTO points_ledger (date, amount, kind, instance_id, reward_id) VALUES (?, ?, ?, ?, ?)',
      [date, amount, kind, instanceId, rewardId]
    );
    return lastId;
  },

  async balance() {
    const row = await getDb().get('SELECT COALESCE(SUM(amount), 0) AS total FROM points_ledger');
    return row.total;
  },

  /** Puntos ganados con tareas en total (lo que gastas en recompensas no cuenta) */
  async totalEarned() {
    const row = await getDb().get(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM points_ledger WHERE kind = 'task_done'"
    );
    return row.total;
  },

  async removeForInstance(instanceId, kind) {
    const { changes } = await getDb().run(
      'DELETE FROM points_ledger WHERE instance_id = ? AND kind = ?',
      [instanceId, kind]
    );
    return changes;
  },

  async forInstance(instanceId) {
    return getDb().all('SELECT amount, kind FROM points_ledger WHERE instance_id = ?', [instanceId]);
  },

  /** Puntos ganados y perdidos por tareas, agrupados por día */
  async dailyTotals(from, to) {
    const rows = await getDb().all(
      `SELECT date,
              COALESCE(SUM(CASE WHEN kind = 'task_done' THEN amount END), 0) AS earned,
              COALESCE(SUM(CASE WHEN kind = 'task_missed' THEN -amount END), 0) AS lost
       FROM points_ledger
       WHERE date BETWEEN ? AND ?
       GROUP BY date`,
      [from, to]
    );
    return Object.fromEntries(rows.map(r => [r.date, { earned: r.earned, lost: r.lost }]));
  },

  async redemptions(limit = 30) {
    return getDb().all(
      `SELECT l.id, l.date, -l.amount AS cost, l.created_at AS createdAt, r.name, r.icon
       FROM points_ledger l JOIN rewards r ON r.id = l.reward_id
       WHERE l.kind = 'reward'
       ORDER BY l.id DESC
       LIMIT ?`,
      [limit]
    );
  }
};

/** Puntos de cada instancia en un día concreto: { [instanceId]: amount } */
pointsRepository.amountsForDate = async function (date) {
  const rows = await getDb().all(
    'SELECT instance_id AS id, amount FROM points_ledger WHERE date = ? AND instance_id IS NOT NULL',
    [date]
  );
  return Object.fromEntries(rows.map(r => [r.id, r.amount]));
};
