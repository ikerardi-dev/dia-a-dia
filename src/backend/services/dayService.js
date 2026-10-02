/**
 * El día a día: generar las tareas de cada día, cerrar los días pasados
 * (restando puntos y aplazando lo que no se hizo), completar, aplazar y comodín.
 */
import { getDb } from '../db/database.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { instanceRepository } from '../repositories/instanceRepository.js';
import { dayRepository } from '../repositories/dayRepository.js';
import { busyRepository } from '../repositories/busyRepository.js';
import { pointsRepository } from '../repositories/pointsRepository.js';
import { settingsRepository } from '../repositories/settingsRepository.js';
import { getSettings } from './settingsService.js';
import { buildSchedule, busyForDate } from './scheduleService.js';
import { isDue, penaltyFor, computeDayStatus, MAX_CARRY, MAX_CATCHUP_DAYS } from './rules.js';
import { todayStr, addDays, diffDays, nowMinutes, fromMin, weekStart } from '../utils/dates.js';
import { assert } from '../utils/errors.js';
import { balanceToday } from './balanceService.js';

/* ---------- Generación y cierre de días ---------- */

export async function ensureDayGenerated(date) {
  const day = await dayRepository.get(date);
  if (day?.generated) return;
  await getDb().transaction(async () => {
    await dayRepository.ensure(date);
    const tasks = await taskRepository.findAll();
    for (const task of tasks) {
      if (isDue(task, date) && !(await instanceRepository.hasRegular(task.id, date))) {
        await instanceRepository.create({ taskId: task.id, date });
      }
    }
    await dayRepository.markGenerated(date);
  });
}

/**
 * Cierra los días anteriores a hoy que sigan abiertos. Lo pendiente pasa a
 * "no hecho", resta puntos y, si no es una tarea diaria, se aplaza al día siguiente.
 * Devuelve el aviso para mostrar hoy (o null).
 */
export async function closePastDays() {
  const today = todayStr();
  let lastClosed = await settingsRepository.get('last_closed');
  if (!lastClosed) {
    // Primera vez que se abre la app: no hay nada que cerrar
    lastClosed = addDays(today, -1);
    await settingsRepository.set('last_closed', lastClosed);
  }

  let date = addDays(lastClosed, 1);
  if (diffDays(date, today) > MAX_CATCHUP_DAYS) date = addDays(today, -MAX_CATCHUP_DAYS);

  const { penaltyPct } = await getSettings();
  const tasks = new Map((await taskRepository.findAll({ includeDeleted: true })).map(t => [t.id, t]));
  const missed = [];

  while (date < today) {
    const current = date;
    await getDb().transaction(async () => {
      await ensureDayGenerated(current);
      const day = await dayRepository.get(current);
      const pending = (await instanceRepository.findByDate(current)).filter(i => i.status === 'pending');

      for (const inst of pending) {
        const task = tasks.get(inst.taskId);
        if (day.wildcard || !task) {
          await instanceRepository.setStatus(inst.id, 'excused');
          continue;
        }

        await instanceRepository.setStatus(inst.id, 'missed');
        const lost = penaltyFor(task.points, penaltyPct);
        await pointsRepository.add({ date: current, amount: -lost, kind: 'task_missed', instanceId: inst.id });

        let movedTo = null;
        const next = addDays(current, 1);
        if (!task.deleted && task.freq.type !== 'daily' && inst.carried < MAX_CARRY && !isDue(task, next)) {
          await dayRepository.ensure(next);
          await instanceRepository.create({ taskId: task.id, date: next, carried: inst.carried + 1, fromDate: current });
          movedTo = next;
        }
        missed.push({ date: current, name: task.name, icon: task.icon, lost, movedTo });
      }

      await dayRepository.markClosed(current);
      await settingsRepository.set('last_closed', current);
    });
    date = addDays(date, 1);
  }

  await ensureDayGenerated(today);
  if (missed.length) {
    await settingsRepository.set('notice', JSON.stringify({ date: today, items: missed }));
  }
  return getNotice();
}

export async function getNotice() {
  const raw = await settingsRepository.get('notice');
  if (!raw) return null;
  try {
    const notice = JSON.parse(raw);
    return notice.date === todayStr() ? notice : null;
  } catch {
    return null;
  }
}

export const dismissNotice = () => settingsRepository.set('notice', '');

/* ---------- Vista de un día ---------- */

export async function getDayView(date) {
  const today = todayStr();
  if (date === today) {
    await ensureDayGenerated(today);
    await balanceToday();
  }

  const [allTasks, blocks, settings, day, stored, amounts] = await Promise.all([
    taskRepository.findAll({ includeDeleted: true }),
    busyRepository.findAll(),
    getSettings(),
    dayRepository.get(date),
    instanceRepository.findByDate(date),
    pointsRepository.amountsForDate(date)
  ]);
  const tasks = new Map(allTasks.map(t => [t.id, t]));

  let instances = stored;
  // Días futuros aún sin generar: se calculan "al vuelo" sin guardarlos
  if (date > today && !day?.generated) {
    const virtual = allTasks
      .filter(t => isDue(t, date) && !stored.some(i => i.taskId === t.id && !i.carried))
      .map(t => ({ id: `v-${t.id}`, taskId: t.id, date, status: 'pending', carried: 0, fromDate: null, notBefore: null, doneAt: null, virtual: true }));
    instances = [...stored, ...virtual];
  }

  const tomorrow = addDays(date, 1);
  const items = instances
    .filter(i => tasks.has(i.taskId))
    .map(i => {
      const task = tasks.get(i.taskId);
      return {
        ...i,
        task,
        points: amounts[i.id] ?? 0,
        // Para que la interfaz sepa si mostrar "Pasar a mañana"
        canMoveTomorrow: i.status === 'pending' && date === today && i.carried < MAX_CARRY && !isDue(task, tomorrow)
      };
    });
  const byStatus = s => items.filter(i => i.status === s);
  const wildcard = !!day?.wildcard;

  const pending = byStatus('pending');
  const schedule = date >= today && !wildcard
    ? buildSchedule({
        items: pending,
        busy: busyForDate(blocks, date),
        settings,
        nowMinutes: date === today ? nowMinutes() : null
      })
    : { slots: [], unplaced: [], busy: busyForDate(blocks, date) };

  const earned = items.reduce((a, i) => a + (i.points > 0 ? i.points : 0), 0);
  const lost = items.reduce((a, i) => a + (i.points < 0 ? -i.points : 0), 0);

  const { maxTaskMinutes } = settings;
  const plannedMinutes = items
    .filter(i => i.status === 'pending' || i.status === 'done')
    .reduce((sum, i) => sum + i.task.duration, 0);

  const anytime = date === today
    ? allTasks.filter(t => !t.deleted && t.freq.type === 'anytime' && !t.completedAt)
    : [];

  return {
    date,
    isToday: date === today,
    anytime,
    maxTaskMinutes,
    plannedMinutes,
    isPast: date < today,
    wildcard,
    status: computeDayStatus({
      date, today, wildcard,
      done: byStatus('done').length,
      missed: byStatus('missed').length,
      pending: pending.length
    }),
    earned,
    lost,
    schedule,
    done: byStatus('done'),
    missed: byStatus('missed'),
    moved: byStatus('moved'),
    excused: byStatus('excused'),
    all: items
  };
}

/* ---------- Acciones sobre tareas de hoy ---------- */

async function pendingToday(instanceId) {
  const inst = await instanceRepository.findById(instanceId);
  assert(inst, 'NOT_FOUND', 'Esa tarea ya no existe.');
  assert(inst.date === todayStr(), 'NOT_TODAY', 'Solo puedes cambiar las tareas de hoy.');
  assert(inst.status === 'pending', 'NOT_PENDING', 'Esa tarea ya no está pendiente.');
  return inst;
}

export async function completeInstance(instanceId) {
  const inst = await pendingToday(instanceId);
  const task = await taskRepository.findById(inst.taskId);
  await getDb().transaction(async () => {
    await instanceRepository.setStatus(inst.id, 'done', fromMin(nowMinutes()));
    await pointsRepository.add({ date: inst.date, amount: task.points, kind: 'task_done', instanceId: inst.id });
  });
  return { points: task.points, balance: await pointsRepository.balance() };
}

/** Las tareas sin fecha se apuntan al día en que las haces */
export async function completeAnytime(taskId) {
  const task = await taskRepository.findById(taskId);
  assert(task && !task.deleted && task.freq.type === 'anytime', 'NOT_FOUND', 'Esa tarea ya no existe.');
  assert(!task.completedAt, 'ALREADY_DONE', 'Esa tarea ya está hecha.');
  const today = todayStr();
  await getDb().transaction(async () => {
    await dayRepository.ensure(today);
    const id = await instanceRepository.create({ taskId: task.id, date: today });
    await instanceRepository.setStatus(id, 'done', fromMin(nowMinutes()));
    await pointsRepository.add({ date: today, amount: task.points, kind: 'task_done', instanceId: id });
    await taskRepository.setCompleted(task.id, today);
  });
  return { points: task.points, balance: await pointsRepository.balance() };
}

export async function undoInstance(instanceId) {
  const inst = await instanceRepository.findById(instanceId);
  assert(inst && inst.status === 'done' && inst.date === todayStr(), 'CANNOT_UNDO', 'Solo puedes deshacer tareas completadas hoy.');
  const entries = await pointsRepository.forInstance(inst.id);
  const amount = entries.filter(e => e.kind === 'task_done').reduce((a, e) => a + e.amount, 0);
  const task = await taskRepository.findById(inst.taskId);
  await getDb().transaction(async () => {
    await pointsRepository.removeForInstance(inst.id, 'task_done');
    if (task.freq.type === 'anytime') {
      // No tenía día asignado: se borra el registro y vuelve a "Cuando puedas"
      await instanceRepository.remove(inst.id);
      await taskRepository.setCompleted(task.id, null);
    } else {
      await instanceRepository.setStatus(inst.id, 'pending', null);
    }
  });
  return { points: -amount, balance: await pointsRepository.balance() };
}

export async function postponeLater(instanceId, minutes = 60) {
  const inst = await pendingToday(instanceId);
  const notBefore = nowMinutes() + minutes;
  await instanceRepository.setNotBefore(inst.id, notBefore);
  return { notBefore: fromMin(Math.min(notBefore, 23 * 60 + 59)) };
}

export async function canMoveToTomorrow(instanceId) {
  const inst = await instanceRepository.findById(instanceId);
  if (!inst || inst.status !== 'pending' || inst.carried >= MAX_CARRY) return false;
  const task = await taskRepository.findById(inst.taskId);
  return !isDue(task, addDays(todayStr(), 1));
}

export async function moveToTomorrow(instanceId) {
  const inst = await pendingToday(instanceId);
  const task = await taskRepository.findById(inst.taskId);
  const tomorrow = addDays(inst.date, 1);
  assert(inst.carried < MAX_CARRY, 'MAX_CARRY', 'Ya la has aplazado dos veces. Toca hacerla.');
  assert(!isDue(task, tomorrow), 'DUE_TOMORROW', 'Mañana ya te toca esta tarea.');

  await getDb().transaction(async () => {
    await instanceRepository.markMoved(inst.id, tomorrow);
    await dayRepository.ensure(tomorrow);
    await instanceRepository.create({ taskId: task.id, date: tomorrow, carried: inst.carried + 1, fromDate: inst.date });
  });
  return { movedTo: tomorrow };
}

/* ---------- Día comodín ---------- */

export async function getWildcardStatus() {
  const today = todayStr();
  const { wildcardsPerWeek } = await getSettings();
  const from = weekStart(today);
  const used = await dayRepository.countWildcards(from, addDays(from, 6));
  const day = await dayRepository.get(today);
  return {
    perWeek: wildcardsPerWeek,
    used,
    available: Math.max(0, wildcardsPerWeek - used),
    activeToday: !!day?.wildcard
  };
}

/** Hoy no cuenta: las tareas pendientes no restan y la racha no se rompe */
export async function useWildcard() {
  const status = await getWildcardStatus();
  assert(!status.activeToday, 'ALREADY_ACTIVE', 'Ya estás usando el comodín hoy.');
  assert(status.available > 0, 'NO_WILDCARDS', 'Ya has usado tus comodines de esta semana.');
  const today = todayStr();
  await ensureDayGenerated(today);
  await getDb().transaction(async () => {
    await dayRepository.setWildcard(today, true);
    await instanceRepository.setStatusForDate(today, 'pending', 'excused');
  });
  return getWildcardStatus();
}

export async function cancelWildcard() {
  const status = await getWildcardStatus();
  assert(status.activeToday, 'NOT_ACTIVE', 'Hoy no estás usando el comodín.');
  const today = todayStr();
  await getDb().transaction(async () => {
    await dayRepository.setWildcard(today, false);
    await instanceRepository.setStatusForDate(today, 'excused', 'pending');
  });
  return getWildcardStatus();
}
