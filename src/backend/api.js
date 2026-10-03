/**
 * Punto de entrada del backend. El frontend solo habla con este objeto:
 * nunca toca la base de datos ni los repositorios directamente.
 *
 * Todas las llamadas pasan por una cola y se atienden de una en una.
 * Así, si Hoy, los avisos y la encuesta piden datos a la vez (por ejemplo
 * a medianoche), no se generan las tareas del día varias veces.
 */
import { initDatabase } from './db/database.js';
import { settingsRepository } from './repositories/settingsRepository.js';
import { pointsRepository } from './repositories/pointsRepository.js';
import * as days from './services/dayService.js';
import * as tasks from './services/taskService.js';
import * as busy from './services/busyService.js';
import * as rewards from './services/rewardService.js';
import * as stats from './services/statsService.js';
import * as settings from './services/settingsService.js';
import * as calendarExport from './services/calendarExportService.js';
import * as ratings from './services/ratingService.js';
import * as pauses from './services/pauseService.js';
import { todayStr } from './utils/dates.js';

async function createDefaultAdapter() {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const { createNativeAdapter } = await import('./db/adapters/nativeAdapter.js');
    return createNativeAdapter();
  }
  // En el APK esta rama desaparece al compilar (__WEB_DB__ = false) y no se incluye sql.js
  if (typeof __WEB_DB__ === 'undefined' || __WEB_DB__) {
    const { createWebAdapter } = await import('./db/adapters/webAdapter.js');
    return createWebAdapter();
  }
  throw new Error('No hay base de datos disponible en esta plataforma.');
}

const endpoints = {
  /** Abre la base de datos, aplica migraciones y cierra los días pasados */
  async init({ adapter } = {}) {
    await initDatabase(adapter ?? (await createDefaultAdapter()));
    await settingsRepository.ensureDefaults();
    return days.closePastDays();
  },

  /** Llamar al volver a la app o al cambiar de día */
  refresh: () => days.closePastDays(),

  // Día
  today: () => days.getDayView(todayStr()),
  day: date => days.getDayView(date),
  notice: days.getNotice,
  dismissNotice: days.dismissNotice,
  completeTask: days.completeInstance,
  completeAnytime: days.completeAnytime,
  undoTask: days.undoInstance,
  postponeLater: days.postponeLater,
  setTaskTime: days.setInstanceTime,
  clearTaskTime: days.clearInstanceTime,
  canMoveToTomorrow: days.canMoveToTomorrow,
  moveToTomorrow: days.moveToTomorrow,

  // Comodín
  wildcard: days.getWildcardStatus,
  useWildcard: days.useWildcard,
  cancelWildcard: days.cancelWildcard,

  // Tareas
  tasks: tasks.listTasks,
  createTask: tasks.createTask,
  updateTask: tasks.updateTask,
  deleteTask: tasks.deleteTask,
  loadExampleTasks: tasks.loadExampleTasks,

  // Horario ocupado
  busy: busy.listBusy,
  createBusy: busy.createBusy,
  updateBusy: busy.updateBusy,
  deleteBusy: busy.deleteBusy,
  events: busy.listEvents,

  // Calendario del móvil
  calendarItems: calendarExport.listCalendarItems,
  setCalendarLink: calendarExport.setCalendarLink,

  // Recompensas
  rewards: rewards.listRewards,
  createReward: rewards.createReward,
  updateReward: rewards.updateReward,
  deleteReward: rewards.deleteReward,
  redeemReward: rewards.redeemReward,
  redemptions: rewards.listRedemptions,
  loadExampleRewards: rewards.loadExampleRewards,

  // Pausas (vacaciones)
  pauses: pauses.listPauses,
  createPause: pauses.createPause,
  updatePause: pauses.updatePause,
  deletePause: pauses.deletePause,

  // Nota del día
  pendingRating: ratings.getPendingRating,
  rateDay: ratings.rateDay,
  snoozeRating: ratings.snoozeRating,

  // Méritos y calendario
  balance: () => pointsRepository.balance(),
  merits: stats.getMerits,
  month: stats.getMonth,

  // Ajustes
  settings: settings.getSettings,
  updateSettings: settings.updateSettings
};

let queue = Promise.resolve();

/** Envuelve una función para que espere su turno en la cola */
const serialized = fn => (...args) => {
  const result = queue.then(() => fn(...args));
  queue = result.catch(() => {}); // un error no bloquea las siguientes llamadas
  return result;
};

export const api = Object.fromEntries(
  Object.entries(endpoints).map(([name, fn]) => [name, serialized(fn)])
);
