import { busyRepository } from '../repositories/busyRepository.js';
import { assert } from '../utils/errors.js';
import { toMin } from '../utils/dates.js';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateBusy(data) {
  const label = String(data.label ?? '').trim() || 'Ocupado';
  assert(label.length <= 30, 'LABEL_TOO_LONG', 'El nombre puede tener como mucho 30 caracteres.');
  assert(TIME_RE.test(data.from) && TIME_RE.test(data.to), 'INVALID_TIME', 'Revisa las horas.');
  assert(toMin(data.to) > toMin(data.from), 'INVALID_RANGE', 'La hora de fin tiene que ser posterior a la de inicio.');

  if (data.date) {
    assert(DATE_RE.test(data.date), 'INVALID_DATE', 'La fecha no es válida.');
    return { label, icon: data.icon || '📅', from: data.from, to: data.to, date: data.date, days: [] };
  }
  const days = [...new Set((data.days ?? []).map(Number))].filter(d => d >= 0 && d <= 6);
  assert(days.length > 0, 'NO_DAYS', 'Elige al menos un día.');
  return { label, icon: data.icon || '📅', from: data.from, to: data.to, date: null, days };
}

export const listBusy = () => busyRepository.findAll();
export const createBusy = data => busyRepository.create(validateBusy(data));
export const updateBusy = (id, data) => busyRepository.update(id, validateBusy(data));
export const deleteBusy = id => busyRepository.remove(id);
