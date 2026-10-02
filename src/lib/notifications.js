/**
 * Avisos del sistema (solo en el APK). Se programan con antelación en Android,
 * así llegan aunque la app esté cerrada. Cada vez que cambian los datos se
 * borran los avisos pendientes y se vuelven a calcular.
 */
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { api } from '../backend/api.js';
import { parseYmd, addDays, todayStr, toMin } from '../backend/utils/dates.js';

const CHANNEL_ID = 'retos';
const DAYS_AHEAD = 3;          // hoy y los dos días siguientes
const MAX_SCHEDULED = 40;

export const notificationsSupported = () => Capacitor.isNativePlatform();

/** 'granted' | 'denied' | 'prompt' | 'unsupported' */
export async function getPermission() {
  if (!notificationsSupported()) return 'unsupported';
  const { display } = await LocalNotifications.checkPermissions();
  return display;
}

export async function requestPermission() {
  if (!notificationsSupported()) return 'unsupported';
  const { display } = await LocalNotifications.requestPermissions();
  if (display === 'granted') await ensureChannel();
  return display;
}

/** ¿Android deja programar avisos a la hora exacta? */
export async function hasExactAlarms() {
  if (!notificationsSupported()) return false;
  try {
    return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted';
  } catch {
    return false;
  }
}

/** Abre los ajustes de Android para permitir alarmas exactas */
export const openExactAlarmSettings = () => LocalNotifications.changeExactNotificationSetting();

async function ensureChannel() {
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Retos del día',
    description: 'Te avisa cuando toca cada tarea',
    importance: 4,
    vibration: true
  });
}

/** Identificador numérico estable a partir de un texto (Android pide un int de 32 bits) */
function idFor(key) {
  let hash = 7;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return (Math.abs(hash) % 2_000_000_000) + 1;
}

async function cancelAll() {
  const { notifications } = await LocalNotifications.getPending();
  if (notifications.length) {
    await LocalNotifications.cancel({ notifications: notifications.map(n => ({ id: n.id })) });
  }
}

async function buildReminders(exact) {
  const now = Date.now();
  const today = todayStr();
  const list = [];

  for (let k = 0; k < DAYS_AHEAD; k++) {
    const date = addDays(today, k);
    const day = await api.day(date);
    if (day.wildcard) continue;

    for (const slot of day.schedule.slots) {
      const at = parseYmd(date);
      at.setHours(Math.floor(slot.start / 60), slot.start % 60, 0, 0);
      if (at.getTime() < now + 60_000) continue;

      list.push({
        id: idFor(`${date}-${slot.taskId}-${slot.carried}`),
        title: `Toca: ${slot.task.name}`,
        body: `${slot.task.icon} +${slot.task.points} puntos si lo haces ahora`,
        channelId: CHANNEL_ID,
        smallIcon: 'ic_stat_diaadia',
        iconColor: '#2B5D8A',
        autoCancel: true,
        // Si no hay permiso de alarma exacta, se programa aproximado sin abrir ajustes
        isExactNotification: exact,
        schedule: { at, allowWhileIdle: true }
      });
    }
  }
  // Eventos con aviso (los enviados al calendario del móvil ya avisa Google Calendar)
  const events = await api.events(today, addDays(today, DAYS_AHEAD - 1));
  for (const ev of events) {
    if (ev.reminder == null || ev.syncCalendar) continue;
    const at = parseYmd(ev.date);
    const start = toMin(ev.from) - ev.reminder;
    at.setHours(0, 0, 0, 0);
    at.setMinutes(start);
    if (at.getTime() < now + 60_000) continue;
    list.push({
      id: idFor(`event-${ev.id}-${ev.date}-${ev.from}`),
      title: `${ev.icon} ${ev.label}`,
      body: `A las ${ev.from}`,
      channelId: CHANNEL_ID,
      smallIcon: 'ic_stat_diaadia',
      iconColor: '#2B5D8A',
      autoCancel: true,
      isExactNotification: exact,
      schedule: { at, allowWhileIdle: true }
    });
  }

  list.sort((a, b) => a.schedule.at - b.schedule.at);
  return list.slice(0, MAX_SCHEDULED);
}

let queue = Promise.resolve();

/** Recalcula todos los avisos pendientes. Las llamadas se encadenan, nunca se pisan. */
export function rescheduleReminders() {
  queue = queue.then(async () => {
    if (!notificationsSupported()) return;
    await cancelAll();

    const { notify } = await api.settings();
    if (!notify || (await getPermission()) !== 'granted') return;

    await ensureChannel();
    const reminders = await buildReminders(await hasExactAlarms());
    if (reminders.length) await LocalNotifications.schedule({ notifications: reminders });
  }).catch(err => console.warn('No se pudieron programar los avisos', err));
  return queue;
}

/** Aviso de prueba dentro de 5 segundos */
export async function sendTestNotification() {
  await ensureChannel();
  await LocalNotifications.schedule({
    notifications: [{
      id: 1,
      title: 'Avisos activados',
      body: 'Así te avisaré cuando toque cada tarea.',
      channelId: CHANNEL_ID,
      smallIcon: 'ic_stat_diaadia',
      iconColor: '#2B5D8A',
      isExactNotification: false,
      schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true }
    }]
  });
}
