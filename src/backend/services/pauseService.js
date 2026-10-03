/**
 * Pausas (vacaciones): entre dos fechas, las tareas marcadas no se generan,
 * no restan y no rompen la racha. Las que se dejan sin marcar siguen activas.
 * Solo se pausan tareas que se repiten (diarias, cada X días, días concretos).
 */
import { getDb } from '../db/database.js';
import { pauseRepository } from '../repositories/pauseRepository.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { instanceRepository } from '../repositories/instanceRepository.js';
import { dayRepository } from '../repositories/dayRepository.js';
import { isDue, REPEATING_TYPES } from './rules.js';
import { todayStr, addDays } from '../utils/dates.js';
import { assert } from '../utils/errors.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ---------- Consultas (las usan los demás servicios) ---------- */

/** Carga las pausas una vez para hacer muchas comprobaciones */
export const loadPauses = () => pauseRepository.findAll();

/** Pausa que cubre una fecha (la primera), o null */
export const pauseOn = (pauses, date) => pauses.find(p => p.from <= date && date <= p.to) ?? null;

/** ¿Está esta tarea en pausa ese día? */
export const isPaused = (pauses, taskId, date) =>
  pauses.some(p => p.from <= date && date <= p.to && p.taskIds.includes(taskId));

/** ¿Toca la tarea ese día y no está en pausa? */
export const isActive = (pauses, task, date) => isDue(task, date) && !isPaused(pauses, task.id, date);

/* ---------- Mantenimiento de hoy ---------- */

/**
 * Tras crear, cambiar o quitar una pausa: añade o quita las tareas de hoy
 * según estén activas o en pausa.
 */
export async function resyncToday() {
  const today = todayStr();
  const day = await dayRepository.get(today);
  if (!day?.generated || day.wildcard) return;
  const [tasks, pauses] = await Promise.all([taskRepository.findAll(), loadPauses()]);
  for (const task of tasks) {
    if (!REPEATING_TYPES.includes(task.freq.type)) continue;
    if (isActive(pauses, task, today)) {
      if (!(await instanceRepository.hasRegular(task.id, today))) {
        await instanceRepository.create({ taskId: task.id, date: today });
      }
    } else {
      await instanceRepository.deletePendingRegular(task.id, today);
      // Las que venían aplazadas de antes tampoco cuentan mientras dure la pausa
      if (isPaused(pauses, task.id, today)) await instanceRepository.excusePendingCarried(task.id, today);
    }
  }
}

/* ---------- CRUD ---------- */

async function validatePause(data, previous = null) {
  const today = todayStr();
  const label = String(data.label ?? '').trim() || 'Vacaciones';
  assert(label.length <= 30, 'LABEL_TOO_LONG', 'El nombre puede tener como mucho 30 caracteres.');
  assert(DATE_RE.test(data.from) && DATE_RE.test(data.to), 'INVALID_DATE', 'Revisa las fechas.');
  assert(data.to >= data.from, 'INVALID_RANGE', 'La fecha de fin tiene que ser igual o posterior a la de inicio.');
  assert(data.to >= today, 'PAST_PAUSE', 'La pausa no puede terminar antes de hoy.');
  // El inicio puede quedarse como estaba aunque ya haya pasado (pausa en curso)
  const startUnchanged = previous && previous.from === data.from;
  assert(startUnchanged || data.from >= today, 'PAST_DATE', 'La pausa no puede empezar antes de hoy.');

  const tasks = await taskRepository.findAll();
  const allowed = new Set(tasks.filter(t => REPEATING_TYPES.includes(t.freq.type)).map(t => t.id));
  const taskIds = [...new Set((data.taskIds ?? []).map(Number))].filter(id => allowed.has(id));
  assert(taskIds.length > 0, 'NO_TASKS', 'Marca al menos una tarea para pausar.');
  return { label, from: data.from, to: data.to, taskIds };
}

export const listPauses = async () => {
  const today = todayStr();
  return (await loadPauses()).filter(p => p.to >= today);
};

export async function createPause(data) {
  const pause = await validatePause(data);
  return getDb().transaction(async () => {
    const id = await pauseRepository.create(pause);
    await resyncToday();
    return id;
  });
}

export async function updatePause(id, data) {
  const previous = await pauseRepository.findById(id);
  assert(previous, 'NOT_FOUND', 'Esa pausa ya no existe.');
  const pause = await validatePause(data, previous);
  await getDb().transaction(async () => {
    await pauseRepository.update(id, pause);
    await resyncToday();
  });
}

/**
 * Quitar una pausa. Si ya había empezado, se termina ayer (para que los días
 * pasados sigan contando como pausados); si no, se borra.
 */
export async function deletePause(id) {
  const pause = await pauseRepository.findById(id);
  assert(pause, 'NOT_FOUND', 'Esa pausa ya no existe.');
  const today = todayStr();
  await getDb().transaction(async () => {
    if (pause.from < today) {
      await pauseRepository.update(id, { ...pause, to: addDays(today, -1) });
    } else {
      await pauseRepository.remove(id);
    }
    await resyncToday();
  });
}
