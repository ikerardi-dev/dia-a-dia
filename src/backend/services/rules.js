/**
 * Reglas del juego. Funciones puras: no tocan la base de datos,
 * así se pueden probar y cambiar sin miedo.
 */
import { diffDays, weekday } from '../utils/dates.js';

/** Máximo de veces que una tarea se puede aplazar seguida */
export const MAX_CARRY = 2;
/** Si abres la app tras mucho tiempo, solo se cierran los últimos 30 días */
export const MAX_CATCHUP_DAYS = 30;

const DOW_SHORT = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 0: 'D' };
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function isDue(task, date) {
  if (task.deleted || date < task.startDate) return false;
  const { type, every, days } = task.freq;
  if (type === 'daily') return true;
  if (type === 'interval') return diffDays(task.startDate, date) % Math.max(2, every) === 0;
  if (type === 'weekdays') return days.includes(weekday(date));
  if (type === 'once') return date === task.startDate;
  return false; // 'anytime': no se programa en ningún día
}

export function describeFreq(freq) {
  if (freq.type === 'daily') return 'Cada día';
  if (freq.type === 'interval') return `Cada ${freq.every} días`;
  if (freq.type === 'once') return 'Una vez';
  if (freq.type === 'anytime') return 'Sin fecha';
  return WEEK_ORDER.filter(d => freq.days.includes(d)).map(d => DOW_SHORT[d]).join(' ');
}

/** Lo que resta no hacer una tarea */
export const penaltyFor = (points, pct) => Math.max(1, Math.round(points * pct / 100));

/**
 * Estado de un día para el calendario y el muro de méritos.
 * good: todo hecho · partial: algo hecho y algo fallado · bad: nada hecho
 * wildcard: comodín usado (no rompe la racha) · progress: hoy con tareas pendientes
 */
export function computeDayStatus({ date, today, done, missed, pending, wildcard }) {
  if (date > today) return 'future';
  if (wildcard) return 'wildcard';
  const total = done + missed + pending;
  if (!total) return 'empty';
  if (date === today) return pending ? 'progress' : done ? 'good' : 'empty';
  if (missed === 0 && done > 0) return 'good';
  if (done > 0) return 'partial';
  if (missed > 0) return 'bad';
  return 'empty';
}
