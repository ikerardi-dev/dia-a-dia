import { now } from './clock.js';

export const pad = n => String(n).padStart(2, '0');
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = s => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s, n) => {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
export const weekday = s => parseYmd(s).getDay();

/** Lunes de la semana a la que pertenece la fecha */
export const weekStart = s => addDays(s, -((weekday(s) + 6) % 7));

export const todayStr = () => ymd(now());
export const nowMinutes = () => {
  const d = now();
  return d.getHours() * 60 + d.getMinutes();
};

export const toMin = t => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
export const fromMin = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
