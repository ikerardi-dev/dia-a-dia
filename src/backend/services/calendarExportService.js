/**
 * Datos para enviar eventos y tareas de una vez al calendario del móvil.
 * El backend solo dice qué debería haber; la sincronización con Android
 * la hace el frontend (src/lib/phoneCalendar.js) con el plugin.
 */
import { busyRepository } from '../repositories/busyRepository.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { fromMin, toMin } from '../utils/dates.js';

/** Huella de lo que se envió: si cambia, hay que actualizar el evento del móvil */
const fingerprint = item => JSON.stringify([item.title, item.date, item.from, item.to, item.allDay, item.alerts]);

export async function listCalendarItems() {
  const [blocks, tasks] = await Promise.all([
    busyRepository.findAll({ includeDeleted: true }),
    taskRepository.findAll({ includeDeleted: true })
  ]);

  const items = [];

  for (const b of blocks) {
    if (!b.date || (!b.syncCalendar && !b.calendarEventId)) continue;
    const item = {
      kind: 'busy', id: b.id, title: `${b.icon} ${b.label}`, date: b.date,
      from: b.from, to: b.to, allDay: false,
      alerts: b.reminder != null ? [-b.reminder] : [],
      wanted: b.syncCalendar && !b.deleted,
      eventId: b.calendarEventId, savedHash: b.calendarHash
    };
    items.push({ ...item, hash: fingerprint(item) });
  }

  for (const t of tasks) {
    if (t.freq.type !== 'once' || (!t.syncCalendar && !t.calendarEventId)) continue;
    const item = {
      kind: 'task', id: t.id, title: `${t.icon} ${t.name}`, date: t.startDate,
      from: t.time || null, to: t.time ? fromMin(toMin(t.time) + t.duration) : null, allDay: !t.time,
      alerts: [],
      wanted: t.syncCalendar && !t.deleted,
      eventId: t.calendarEventId, savedHash: t.calendarHash
    };
    items.push({ ...item, hash: fingerprint(item) });
  }
  return items;
}

export async function setCalendarLink(kind, id, eventId, hash) {
  const repo = kind === 'busy' ? busyRepository : taskRepository;
  await repo.setCalendarLink(id, eventId, hash);
}
