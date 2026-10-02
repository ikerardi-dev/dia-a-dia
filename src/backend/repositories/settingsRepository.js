import { getDb } from '../db/database.js';

const DEFAULTS = {
  wake: '08:00',
  sleep: '23:00',
  penalty_pct: '50',
  notify: '0',
  wildcards_per_week: '1',
  last_closed: '',
  notice: ''
};

export const settingsRepository = {
  async ensureDefaults() {
    const db = getDb();
    for (const [key, value] of Object.entries(DEFAULTS)) {
      await db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
  },

  async getAll() {
    const rows = await getDb().all('SELECT key, value FROM settings');
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  },

  async get(key) {
    const row = await getDb().get('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : DEFAULTS[key];
  },

  async set(key, value) {
    await getDb().run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, String(value)]
    );
  }
};
