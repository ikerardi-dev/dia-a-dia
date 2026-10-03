/**
 * Nota del día. La app pregunta:
 *  - por HOY, desde 1 h 30 min antes de la hora de terminar el día;
 *  - por AYER, al abrir la app si ayer quedó sin nota.
 * "Preguntar más tarde" la pospone una hora.
 */
import { ratingRepository } from '../repositories/ratingRepository.js';
import { dayRepository } from '../repositories/dayRepository.js';
import { settingsRepository } from '../repositories/settingsRepository.js';
import { getSettings } from './settingsService.js';
import { now } from '../utils/clock.js';
import { todayStr, addDays, nowMinutes, toMin } from '../utils/dates.js';
import { assert } from '../utils/errors.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const ASK_BEFORE_END = 90;   // minutos antes de terminar el día
export const SNOOZE_MINUTES = 60;

export function validateScore(score) {
  const value = Number(score);
  assert(Number.isFinite(value) && value >= 0 && value <= 10 && Number.isInteger(value * 2),
    'INVALID_SCORE', 'La nota va de 0 a 10, de medio en medio punto.');
  return value;
}

/** ¿Toca preguntar? Devuelve { date, isToday } o null */
export async function getPendingRating() {
  const snoozeUntil = Number(await settingsRepository.get('rating_snooze_until'));
  if (now().getTime() < snoozeUntil) return null;

  const today = todayStr();
  const { sleep } = await getSettings();

  if (nowMinutes() >= toMin(sleep) - ASK_BEFORE_END && (await ratingRepository.get(today)) === null) {
    return { date: today, isToday: true };
  }

  // Solo se pregunta por ayer si la app ya se usaba ese día
  const yesterday = addDays(today, -1);
  const usedYesterday = await dayRepository.get(yesterday);
  if (usedYesterday && (await ratingRepository.get(yesterday)) === null) {
    return { date: yesterday, isToday: false };
  }
  return null;
}

export async function rateDay(date, score) {
  assert(DATE_RE.test(date), 'INVALID_DATE', 'La fecha no es válida.');
  assert(date <= todayStr(), 'FUTURE_DATE', 'No puedes valorar un día que aún no ha llegado.');
  const value = validateScore(score);
  await ratingRepository.set(date, value);
  await settingsRepository.set('rating_snooze_until', '0');
  return { date, score: value };
}

export async function snoozeRating() {
  const until = now().getTime() + SNOOZE_MINUTES * 60_000;
  await settingsRepository.set('rating_snooze_until', String(until));
  return { until };
}

export const getRating = date => ratingRepository.get(date);
export const ratingSummary = () => ratingRepository.summary();
