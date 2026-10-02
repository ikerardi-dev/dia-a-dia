/**
 * Punto de entrada del backend. El frontend solo habla con este objeto:
 * nunca toca la base de datos ni los repositorios directamente.
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
import { todayStr } from './utils/dates.js';

async function createDefaultAdapter() {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const { createNativeAdapter } = await import('./db/adapters/nativeAdapter.js');
    return createNativeAdapter();
  }
  const { createWebAdapter } = await import('./db/adapters/webAdapter.js');
  return createWebAdapter();
}

export const api = {
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

  // Méritos y calendario
  balance: () => pointsRepository.balance(),
  merits: stats.getMerits,
  month: stats.getMonth,

  // Ajustes
  settings: settings.getSettings,
  updateSettings: settings.updateSettings
};
