import { getDb } from '../db/database.js';

const toDay = row => row && ({
  date: row.date,
  generated: !!row.generated,
  closed: !!row.closed,
  wildcard: !!row.wildcard
});

export const dayRepository = {
  async get(date) {
    return toDay(await getDb().get('SELECT * FROM days WHERE date = ?', [date]));
  },

  async ensure(date) {
    await getDb().run('INSERT OR IGNORE INTO days (date) VALUES (?)', [date]);
  },

  async markGenerated(date) {
    await getDb().run('UPDATE days SET generated = 1 WHERE date = ?', [date]);
  },

  async markClosed(date) {
    await getDb().run('UPDATE days SET closed = 1 WHERE date = ?', [date]);
  },

  async setWildcard(date, value) {
    await getDb().run('UPDATE days SET wildcard = ? WHERE date = ?', [value ? 1 : 0, date]);
  },

  async countWildcards(from, to) {
    const row = await getDb().get(
      'SELECT COUNT(*) AS n FROM days WHERE wildcard = 1 AND date BETWEEN ? AND ?',
      [from, to]
    );
    return row.n;
  },

  async findBetween(from, to) {
    const rows = await getDb().all('SELECT * FROM days WHERE date BETWEEN ? AND ? ORDER BY date', [from, to]);
    return rows.map(toDay);
  }
};
