/**
 * Envía al calendario del móvil (Google Calendar, etc.) los eventos y tareas
 * de una vez marcados. Compara lo que hay en la app con lo último enviado:
 * crea lo nuevo, actualiza lo que cambió y borra lo que ya no se quiere.
 * La conexión es en un solo sentido: app → móvil.
 */
import { Capacitor } from '@capacitor/core';
import { CapacitorCalendar, CalendarPermissionScope } from '@ebarooni/capacitor-calendar';
import { api } from '../backend/api.js';
import { parseYmd, toMin } from '../backend/utils/dates.js';

export const phoneCalendarSupported = () => Capacitor.isNativePlatform();

export async function hasCalendarPermission() {
  if (!phoneCalendarSupported()) return false;
  try {
    const { result } = await CapacitorCalendar.checkPermission({ scope: CalendarPermissionScope.WRITE_CALENDAR });
    return result === 'granted';
  } catch {
    return false;
  }
}

/** Pide permiso si hace falta. Devuelve true si se puede usar el calendario. */
export async function ensureCalendarPermission() {
  if (!phoneCalendarSupported()) return false;
  if (await hasCalendarPermission()) return true;
  try {
    const { result } = await CapacitorCalendar.requestFullCalendarAccess();
    return result === 'granted';
  } catch {
    return false;
  }
}

const atTime = (date, time) => {
  const d = parseYmd(date);
  const m = toMin(time);
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d.getTime();
};

function eventOptions(item) {
  const base = { title: item.title, description: 'Creado desde Día a Día', alerts: item.alerts };
  if (item.allDay) return { ...base, isAllDay: true, startDate: parseYmd(item.date).getTime() };
  return { ...base, isAllDay: false, startDate: atTime(item.date, item.from), endDate: atTime(item.date, item.to) };
}

async function syncItem(item) {
  if (item.wanted) {
    if (!item.eventId) {
      const { id } = await CapacitorCalendar.createEvent(eventOptions(item));
      await api.setCalendarLink(item.kind, item.id, id, item.hash);
    } else if (item.hash !== item.savedHash) {
      await CapacitorCalendar.modifyEvent({ id: item.eventId, ...eventOptions(item) });
      await api.setCalendarLink(item.kind, item.id, item.eventId, item.hash);
    }
  } else if (item.eventId) {
    try {
      await CapacitorCalendar.deleteEvent({ id: item.eventId });
    } catch { /* ya no existía en el móvil */ }
    await api.setCalendarLink(item.kind, item.id, null, null);
  }
}

let queue = Promise.resolve();

/** Sincroniza todo. Las llamadas se encadenan para no crear eventos repetidos. */
export function syncPhoneCalendar() {
  queue = queue.then(async () => {
    if (!phoneCalendarSupported()) return;
    const items = await api.calendarItems();
    const pending = items.filter(i => (i.wanted && (!i.eventId || i.hash !== i.savedHash)) || (!i.wanted && i.eventId));
    if (!pending.length || !(await hasCalendarPermission())) return;
    for (const item of pending) {
      try {
        await syncItem(item);
      } catch (err) {
        console.warn('No se pudo sincronizar con el calendario', item.title, err);
      }
    }
  });
  return queue;
}
