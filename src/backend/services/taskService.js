import { getDb } from '../db/database.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { instanceRepository } from '../repositories/instanceRepository.js';
import { dayRepository } from '../repositories/dayRepository.js';
import { isDue, describeFreq } from './rules.js';
import { todayStr } from '../utils/dates.js';
import { assert } from '../utils/errors.js';
import { EXAMPLE_TASKS } from './exampleData.js';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const PREFS = ['manana', 'tarde', 'noche', 'cualquiera'];

export function validateTask(data) {
  const name = String(data.name ?? '').trim();
  assert(name.length > 0, 'NAME_REQUIRED', 'Ponle un nombre a la tarea.');
  assert(name.length <= 40, 'NAME_TOO_LONG', 'El nombre puede tener como mucho 40 caracteres.');

  const points = Number(data.points);
  assert(Number.isInteger(points) && points >= 1 && points <= 500, 'INVALID_POINTS', 'Los puntos van de 1 a 500.');

  const type = data.freq?.type;
  assert(['daily', 'interval', 'weekdays'].includes(type), 'INVALID_FREQ', 'Elige una frecuencia.');
  const every = Number(data.freq.every ?? 2);
  if (type === 'interval') {
    assert(Number.isInteger(every) && every >= 2 && every <= 30, 'INVALID_EVERY', 'Elige cada cuántos días (de 2 a 30).');
  }
  const days = [...new Set((data.freq.days ?? []).map(Number))].filter(d => d >= 0 && d <= 6);
  if (type === 'weekdays') assert(days.length > 0, 'NO_DAYS', 'Elige al menos un día de la semana.');

  const pref = PREFS.includes(data.pref) ? data.pref : 'cualquiera';
  const time = data.time ? String(data.time) : '';
  assert(!time || TIME_RE.test(time), 'INVALID_TIME', 'La hora fija no es válida.');

  const duration = Number(data.duration ?? 30);
  assert(Number.isInteger(duration) && duration >= 5 && duration <= 240, 'INVALID_DURATION', 'La duración va de 5 a 240 minutos.');

  return {
    name,
    icon: String(data.icon || '⭐'),
    points,
    freq: { type, every: type === 'interval' ? every : null, days: type === 'weekdays' ? days : [] },
    pref,
    time,
    duration
  };
}

/** Si hoy ya está generado, añade o quita la instancia de hoy según la tarea */
async function syncToday(task) {
  const today = todayStr();
  const day = await dayRepository.get(today);
  if (!day?.generated || day.wildcard) return;
  if (isDue(task, today)) {
    if (!(await instanceRepository.hasRegular(task.id, today))) {
      await instanceRepository.create({ taskId: task.id, date: today });
    }
  } else {
    await instanceRepository.deletePendingRegular(task.id, today);
  }
}

export async function listTasks() {
  const tasks = await taskRepository.findAll();
  return tasks.map(t => ({ ...t, freqLabel: describeFreq(t.freq) }));
}

export async function createTask(data) {
  const task = { ...validateTask(data), startDate: todayStr() };
  return getDb().transaction(async () => {
    const id = await taskRepository.create(task);
    await syncToday({ ...task, id, deleted: false });
    return id;
  });
}

export async function updateTask(id, data) {
  const existing = await taskRepository.findById(id);
  assert(existing && !existing.deleted, 'NOT_FOUND', 'Esa tarea ya no existe.');
  const task = validateTask(data);
  await getDb().transaction(async () => {
    await taskRepository.update(id, task);
    await syncToday({ ...existing, ...task });
  });
}

export async function deleteTask(id) {
  await getDb().transaction(async () => {
    await taskRepository.softDelete(id);
    await instanceRepository.deletePendingFrom(id, todayStr());
  });
}

export async function loadExampleTasks() {
  for (const t of EXAMPLE_TASKS) await createTask(t);
}
