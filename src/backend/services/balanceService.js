/**
 * Límite de tiempo de tareas al día. Si hoy se pasa, mueve solas las tareas
 * flexibles al primer día de la próxima semana que tenga hueco.
 *
 * Se pueden mover: tareas sin hora fija de tipo "cada X días", "días concretos"
 * o "una vez". Nunca se mueven las diarias, las aplazadas ni las ya movidas.
 */
import { getDb } from '../db/database.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { instanceRepository } from '../repositories/instanceRepository.js';
import { dayRepository } from '../repositories/dayRepository.js';
import { getSettings } from './settingsService.js';
import { isDue } from './rules.js';
import { loadPauses, isActive, isPaused } from './pauseService.js';
import { todayStr, addDays } from '../utils/dates.js';

const MOVABLE_TYPES = ['interval', 'weekdays', 'once'];
const SEARCH_DAYS = 7;
const COUNTED = ['pending', 'done'];

export const isMovable = (inst, task) =>
  inst.status === 'pending' && MOVABLE_TYPES.includes(task.freq.type) &&
  !task.time && inst.carried === 0 && !inst.autoMoved && inst.pinnedStart == null;

/** Minutos de tareas previstos para un día (guardados + los que tocarían) */
export async function plannedMinutes(date, tasks) {
  const byId = new Map(tasks.map(t => [t.id, t]));
  const [day, stored, pauses] = await Promise.all([dayRepository.get(date), instanceRepository.findByDate(date), loadPauses()]);
  let total = stored
    .filter(i => COUNTED.includes(i.status))
    .reduce((sum, i) => sum + (byId.get(i.taskId)?.duration ?? 0), 0);
  if (!day?.generated) {
    for (const t of tasks) {
      if (isActive(pauses, t, date) && !stored.some(i => i.taskId === t.id && !i.carried)) total += t.duration;
    }
  }
  return total;
}

async function findTargetDay(task, from, max, tasks) {
  const pauses = await loadPauses();
  for (let k = 1; k <= SEARCH_DAYS; k++) {
    const date = addDays(from, k);
    if (isDue(task, date) || isPaused(pauses, task.id, date) || (await instanceRepository.existsOn(task.id, date))) continue;
    if ((await plannedMinutes(date, tasks)) + task.duration <= max) return date;
  }
  return null;
}

/** Devuelve la lista de tareas movidas: [{ name, icon, movedTo }] */
export async function balanceToday() {
  const { maxTaskMinutes: max } = await getSettings();
  if (!max) return [];

  const today = todayStr();
  const day = await dayRepository.get(today);
  if (!day?.generated || day.wildcard) return [];

  const tasks = await taskRepository.findAll({ includeDeleted: true });
  const active = tasks.filter(t => !t.deleted);
  const byId = new Map(tasks.map(t => [t.id, t]));
  const instances = await instanceRepository.findByDate(today);

  let load = instances
    .filter(i => COUNTED.includes(i.status))
    .reduce((sum, i) => sum + (byId.get(i.taskId)?.duration ?? 0), 0);
  if (load <= max) return [];

  const candidates = instances.filter(i => byId.has(i.taskId) && isMovable(i, byId.get(i.taskId)));
  const moved = [];

  while (load > max && candidates.length) {
    // La más pequeña que baste para no pasarse; si ninguna basta, la más grande
    const excess = load - max;
    candidates.sort((a, b) => byId.get(a.taskId).duration - byId.get(b.taskId).duration);
    const index = candidates.findIndex(c => byId.get(c.taskId).duration >= excess);
    const [pick] = candidates.splice(index >= 0 ? index : candidates.length - 1, 1);
    const task = byId.get(pick.taskId);

    const target = await findTargetDay(task, today, max, active);
    if (!target) continue;

    await getDb().transaction(async () => {
      await instanceRepository.markMoved(pick.id, target, true);
      await dayRepository.ensure(target);
      await instanceRepository.create({ taskId: task.id, date: target, fromDate: today, autoMoved: true });
    });
    load -= task.duration;
    moved.push({ name: task.name, icon: task.icon, movedTo: target });
  }
  return moved;
}
