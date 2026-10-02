import { settingsRepository } from '../repositories/settingsRepository.js';
import { assert } from '../utils/errors.js';
import { toMin } from '../utils/dates.js';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function getSettings() {
  const s = await settingsRepository.getAll();
  return {
    wake: s.wake,
    sleep: s.sleep,
    penaltyPct: Number(s.penalty_pct),
    notify: s.notify === '1',
    wildcardsPerWeek: Number(s.wildcards_per_week)
  };
}

export async function updateSettings(changes) {
  const current = await getSettings();
  const next = { ...current, ...changes };

  assert(TIME_RE.test(next.wake) && TIME_RE.test(next.sleep), 'INVALID_TIME', 'La hora no es válida.');
  assert(toMin(next.sleep) > toMin(next.wake), 'INVALID_RANGE', 'El día tiene que terminar después de empezar.');
  assert([25, 50, 75, 100].includes(next.penaltyPct), 'INVALID_PENALTY', 'La penalización no es válida.');
  assert(Number.isInteger(next.wildcardsPerWeek) && next.wildcardsPerWeek >= 0 && next.wildcardsPerWeek <= 3,
    'INVALID_WILDCARDS', 'Puedes tener de 0 a 3 comodines por semana.');

  await settingsRepository.set('wake', next.wake);
  await settingsRepository.set('sleep', next.sleep);
  await settingsRepository.set('penalty_pct', next.penaltyPct);
  await settingsRepository.set('notify', next.notify ? '1' : '0');
  await settingsRepository.set('wildcards_per_week', next.wildcardsPerWeek);
  return next;
}
