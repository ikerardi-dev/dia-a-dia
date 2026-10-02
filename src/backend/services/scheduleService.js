/**
 * Reparte las tareas pendientes de un día en los huecos libres,
 * respetando las horas ocupadas (clase, trabajo...). Función pura.
 */
import { toMin, weekday } from '../utils/dates.js';

const GAP_AFTER_TASK = 10; // minutos de margen entre una tarea y la siguiente
const PREF_ORDER = { manana: 0, tarde: 1, noche: 2, cualquiera: 3 };

/** Bloques ocupados que afectan a una fecha, ya en minutos */
export function busyForDate(blocks, date) {
  const dow = weekday(date);
  return blocks
    .filter(b => (b.date ? b.date === date : b.days.includes(dow)))
    .map(b => ({ block: b, start: toMin(b.from), end: toMin(b.to) }))
    .sort((a, b) => a.start - b.start);
}

/** Primer hueco libre de `duration` minutos entre `from` y `to` */
export function findSlot(occupied, from, to, duration) {
  let start = Math.ceil(from / 5) * 5;
  const sorted = [...occupied].sort((a, b) => a[0] - b[0]);
  let moved = true;
  while (moved) {
    moved = false;
    for (const [a, b] of sorted) {
      if (start < b && start + duration > a) {
        start = Math.ceil(b / 5) * 5;
        moved = true;
      }
    }
  }
  return start + duration <= to ? start : null;
}

/**
 * @param items     instancias pendientes con su tarea: [{ ...instance, task }]
 * @param busy      resultado de busyForDate
 * @param settings  { wake, sleep }
 * @param nowMinutes minutos actuales si el día es hoy; null para otros días
 */
export function buildSchedule({ items, busy, settings, nowMinutes = null }) {
  const wake = toMin(settings.wake);
  const sleep = toMin(settings.sleep);
  const windows = {
    manana: [wake, 13 * 60],
    tarde: [13 * 60, 19 * 60 + 30],
    noche: [19 * 60, sleep],
    cualquiera: [wake, sleep]
  };

  const occupied = busy.map(b => [b.start, b.end]);
  const sorted = [...items].sort((a, b) =>
    (a.task.time ? 0 : 1) - (b.task.time ? 0 : 1) ||
    (a.task.time && b.task.time ? toMin(a.task.time) - toMin(b.task.time) : 0) ||
    b.carried - a.carried ||
    PREF_ORDER[a.task.pref] - PREF_ORDER[b.task.pref] ||
    b.task.duration - a.task.duration
  );

  const slots = [];
  const unplaced = [];

  for (const item of sorted) {
    const duration = item.task.duration;
    const floor = Math.max(wake, nowMinutes ?? 0, item.notBefore ?? 0);
    let start;

    if (item.task.time) {
      start = findSlot(occupied, Math.max(toMin(item.task.time), floor), sleep, duration);
    } else {
      const [a, b] = windows[item.task.pref] || windows.cualquiera;
      start = findSlot(occupied, Math.max(a, floor), b, duration);
      if (start === null) start = findSlot(occupied, floor, sleep, duration);
    }

    if (start === null) {
      unplaced.push(item);
      continue;
    }
    occupied.push([start, start + duration + GAP_AFTER_TASK]);
    slots.push({ ...item, start, end: start + duration });
  }

  slots.sort((a, b) => a.start - b.start);
  return { slots, unplaced, busy };
}
