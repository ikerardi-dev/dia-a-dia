import { getDb } from '../db/database.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { instanceRepository } from '../repositories/instanceRepository.js';
import { dayRepository } from '../repositories/dayRepository.js';
import { isDue, describeFreq } from './rules.js';
import { todayStr } from '../utils/dates.js';
import { assert } from '../utils/errors.js';
import { EXAMPLE_TASKS } from './exampleData.js';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PREFS = ['manana', 'tarde', 'noche', 'cualquiera'];
const TYPES = ['daily', 'interval', 'weekdays', 'once', 'anytime'];

/**
 * Comprueba y normaliza los datos de una tarea.
 * @param previous la tarea antes de editarla (null al crear)
 */
export function validateTask(data, previous = null) {
  const today = todayStr();
  const name = String(data.name ?? '').trim();
  assert(name.length > 0, 'NAME_REQUIRED', 'Ponle un nombre a la tarea.');
  assert(name.length <= 40, 'NAME_TOO_LONG', 'El nombre puede tener como mucho 40 caracteres.');

  const points = Number(data.points);
  assert(Number.isInteger(points) && points >= 1 && points <= 500, 'INVALID_POINTS', 'Los puntos van de 1 a 500.');

  const type = data.freq?.type;
  assert(TYPES.includes(type), 'INVALID_FREQ', 'Elige una frecuencia.');
  const every = Number(data.freq.every ?? 2);
  if (type === 'interval') {
    assert(Number.isInteger(every) && every >= 2 && every <= 30, 'INVALID_EVERY', 'Elige cada cuántos días (de 2 a 30).');
  }
  const days = [...new Set((data.freq.days ?? []).map(Number))].filter(d => d >= 0 && d <= 6);
  if (type === 'weekdays') assert(days.length > 0, 'NO_DAYS', 'Elige al menos un día de la semana.');

  // Fecha: "empieza el" para las que se repiten, "qué día" para las de una vez.
  // Las tareas sin fecha guardan el día en que se crearon.
  let startDate;
  if (type === 'anytime') {
    startDate = previous?.startDate ?? today;
  } else {
    startDate = data.startDate || today;
    assert(DATE_RE.test(startDate), 'INVALID_DATE', 'La fecha no es válida.');
    const unchanged = previous && previous.startDate === startDate;
    assert(unchanged || startDate >= today, 'PAST_DATE', 'La fecha no puede ser anterior a hoy.');
  }

  const pref = PREFS.includes(data.pref) ? data.pref : 'cualquiera';
  const time = type === 'anytime' || !data.time ? '' : String(data.time);
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
    duration,
    startDate,
    syncCalendar: type === 'once' && !!data.syncCalendar
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

/** Tareas visibles: oculta las sin fecha ya hechas y las de una vez ya pasadas */
export async function listTasks() {
  const today = todayStr();
  const tasks = await taskRepository.findAll();
  return tasks
    .filter(t => {
      if (t.freq.type === 'anytime') return !t.completedAt;
      if (t.freq.type === 'once') return t.startDate >= today;
      return true;
    })
    .map(t => ({ ...t, freqLabel: describeFreq(t.freq) }));
}

export async function createTask(data) {
  const task = validateTask(data);
  return getDb().transaction(async () => {
    const id = await taskRepository.create(task);
    await syncToday({ ...task, id, deleted: false });
    return id;
  });
}

export async function updateTask(id, data) {
  const existing = await taskRepository.findById(id);
  assert(existing && !existing.deleted, 'NOT_FOUND', 'Esa tarea ya no existe.');
  const task = validateTask(data, existing);
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
