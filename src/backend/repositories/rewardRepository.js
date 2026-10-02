import { getDb } from '../db/database.js';

const toReward = row => row && ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  cost: row.cost,
  deleted: !!row.deleted
});

export const rewardRepository = {
  async findAll() {
    const rows = await getDb().all('SELECT * FROM rewards WHERE deleted = 0 ORDER BY cost');
    return rows.map(toReward);
  },

  async findById(id) {
    return toReward(await getDb().get('SELECT * FROM rewards WHERE id = ?', [id]));
  },

  async create({ name, icon, cost }) {
    const { lastId } = await getDb().run(
      'INSERT INTO rewards (name, icon, cost) VALUES (?, ?, ?)',
      [name, icon, cost]
    );
    return lastId;
  },

  async update(id, { name, icon, cost }) {
    await getDb().run('UPDATE rewards SET name = ?, icon = ?, cost = ? WHERE id = ?', [name, icon, cost, id]);
  },

  /** Borrado lógico: los canjes antiguos siguen apareciendo en el historial */
  async softDelete(id) {
    await getDb().run('UPDATE rewards SET deleted = 1 WHERE id = ?', [id]);
  }
};
