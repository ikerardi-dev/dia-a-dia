import { getDb } from '../db/database.js';

export const ratingRepository = {
  async get(date) {
    const row = await getDb().get('SELECT score FROM day_ratings WHERE date = ?', [date]);
    return row ? row.score : null;
  },

  async set(date, score) {
    await getDb().run(
      `INSERT INTO day_ratings (date, score) VALUES (?, ?)
       ON CONFLICT(date) DO UPDATE SET score = excluded.score, updated_at = datetime('now', 'localtime')`,
      [date, score]
    );
  },

  /** Notas entre dos fechas: { [date]: score } */
  async between(from, to) {
    const rows = await getDb().all('SELECT date, score FROM day_ratings WHERE date BETWEEN ? AND ?', [from, to]);
    return Object.fromEntries(rows.map(r => [r.date, r.score]));
  },

  async summary() {
    const row = await getDb().get('SELECT AVG(score) AS average, COUNT(*) AS count FROM day_ratings');
    return { average: row.count ? Math.round(row.average * 10) / 10 : null, count: row.count };
  }
};
