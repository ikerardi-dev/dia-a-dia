/**
 * Méritos, rachas, medallas y resumen del calendario.
 */
import { taskRepository } from '../repositories/taskRepository.js';
import { instanceRepository } from '../repositories/instanceRepository.js';
import { dayRepository } from '../repositories/dayRepository.js';
import { pointsRepository } from '../repositories/pointsRepository.js';
import { computeDayStatus } from './rules.js';
import { loadPauses, isActive, pauseOn } from './pauseService.js';
import { todayStr, addDays, weekStart, ymd } from '../utils/dates.js';
import { listEvents } from './busyService.js';
import { ratingRepository } from '../repositories/ratingRepository.js';

const WALL_WEEKS = 20;

const MEDALS = [
  { id: 'first', icon: '🌱', name: 'Primer paso', desc: 'Completa una tarea', ok: c => c.done >= 1 },
  { id: 'p100', icon: '🥉', name: '100 puntos', desc: 'Gana 100 puntos', ok: c => c.earned >= 100 },
  { id: 'p500', icon: '🥈', name: '500 puntos', desc: 'Gana 500 puntos', ok: c => c.earned >= 500 },
  { id: 'p1000', icon: '🥇', name: '1.000 puntos', desc: 'Gana 1.000 puntos', ok: c => c.earned >= 1000 },
  { id: 'week', icon: '🔥', name: 'Semana redonda', desc: '7 días cumplidos seguidos', ok: c => c.bestStreak >= 7 },
  { id: 'habit', icon: '🎯', name: 'Constancia', desc: 'La misma tarea 10 veces', ok: c => c.maxPerTask >= 10 },
  { id: 'month', icon: '🏆', name: 'Mes en verde', desc: '30 días cumplidos', ok: c => c.green >= 30 },
  { id: 'reward', icon: '🎁', name: 'Te lo has ganado', desc: 'Canjea una recompensa', ok: c => c.redeemed >= 1 }
];

/** Estado de cada día con actividad entre dos fechas: { [date]: {...} } */
async function summariesBetween(from, to) {
  const today = todayStr();
  const [instances, days, totals, pauses] = await Promise.all([
    instanceRepository.findBetween(from, to),
    dayRepository.findBetween(from, to),
    pointsRepository.dailyTotals(from, to),
    loadPauses()
  ]);
  const wildcards = new Set(days.filter(d => d.wildcard).map(d => d.date));
  const counts = {};
  for (const i of instances) {
    const c = (counts[i.date] ??= { done: 0, missed: 0, pending: 0, instances: [] });
    if (i.status in c) c[i.status]++;
    c.instances.push(i);
  }
  // Días en pausa (hasta hoy) aunque no tengan tareas
  const pausedDates = [];
  for (const p of pauses) {
    for (let d = p.from > from ? p.from : from; d <= p.to && d <= to && d <= today; d = addDays(d, 1)) pausedDates.push(d);
  }
  const dates = new Set([...Object.keys(counts), ...wildcards, ...pausedDates]);
  const result = {};
  for (const date of dates) {
    const c = counts[date] ?? { done: 0, missed: 0, pending: 0, instances: [] };
    result[date] = {
      date,
      status: computeDayStatus({ date, today, wildcard: wildcards.has(date), paused: !!pauseOn(pauses, date), ...c }),
      earned: totals[date]?.earned ?? 0,
      lost: totals[date]?.lost ?? 0,
      instances: c.instances
    };
  }
  return result;
}

function computeStreaks(summaries, today) {
  const dates = Object.keys(summaries).sort();
  let best = 0, run = 0;
  for (const d of dates) {
    const s = summaries[d].status;
    if (s === 'good') best = Math.max(best, ++run);
    else if (s === 'bad' || s === 'partial') run = 0;
  }

  // Racha actual: hacia atrás desde hoy (hoy solo cuenta si ya está completo)
  let current = 0;
  const first = dates[0];
  for (let d = today; first && d >= first; d = addDays(d, -1)) {
    const s = summaries[d]?.status ?? 'empty';
    if (s === 'good') current++;
    else if (s === 'bad' || s === 'partial') break;
    // empty, wildcard y progress no suman ni rompen
  }
  return { current, best: Math.max(best, current) };
}

export async function getMerits() {
  const today = todayStr();
  const [summaries, tasks, balance, earned, perTask, redemptions] = await Promise.all([
    summariesBetween('0000-01-01', today),
    taskRepository.findAll({ includeDeleted: true }),
    pointsRepository.balance(),
    pointsRepository.totalEarned(),
    instanceRepository.countDoneByTask(),
    pointsRepository.redemptions(1000),
  ]);
  const [ratings, ratingStats] = await Promise.all([
    ratingRepository.between('0000-01-01', today),
    ratingRepository.summary()
  ]);
  const taskById = new Map(tasks.map(t => [t.id, t]));
  const list = Object.values(summaries);
  const streak = computeStreaks(summaries, today);

  const counts = {
    done: list.reduce((a, d) => a + d.instances.filter(i => i.status === 'done').length, 0),
    green: list.filter(d => d.status === 'good').length,
    red: list.filter(d => d.status === 'bad').length,
    wildcards: list.filter(d => d.status === 'wildcard').length,
    paused: list.filter(d => d.status === 'paused').length,
    earned,
    bestStreak: streak.best,
    maxPerTask: Math.max(0, ...perTask.map(p => p.n)),
    redeemed: redemptions.length
  };

  // Muro: las últimas 20 semanas, de lunes a domingo
  const start = addDays(weekStart(today), -7 * (WALL_WEEKS - 1));
  const wall = [];
  for (let k = 0; k < WALL_WEEKS * 7; k++) {
    const date = addDays(start, k);
    const s = summaries[date];
    wall.push({
      date,
      status: date > today ? 'future' : s?.status ?? 'empty',
      earned: s?.earned ?? 0,
      lost: s?.lost ?? 0,
      rating: ratings[date] ?? null
    });
  }

  const recent = list
    .filter(d => d.instances.length || d.status === 'wildcard')
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 21)
    .map(d => ({
      date: d.date,
      status: d.status,
      net: d.earned - d.lost,
      rating: ratings[d.date] ?? null,
      items: d.instances
        .filter(i => taskById.has(i.taskId))
        .map(i => ({ icon: taskById.get(i.taskId).icon, name: taskById.get(i.taskId).name, status: i.status }))
    }));

  return {
    balance,
    earned,
    streak,
    counts,
    rating: ratingStats,
    wall,
    recent,
    medals: MEDALS.map(({ ok, ...m }) => ({ ...m, unlocked: ok(counts) }))
  };
}

/** Calendario de un mes (month: 0-11), en semanas de lunes a domingo */
export async function getMonth(year, month) {
  const today = todayStr();
  const first = ymd(new Date(year, month, 1));
  const last = ymd(new Date(year, month + 1, 0));
  const from = weekStart(first);
  const to = addDays(weekStart(last), 6);

  const [summaries, tasks, days, events, pauses] = await Promise.all([
    summariesBetween(from, to),
    taskRepository.findAll({ includeDeleted: true }),
    dayRepository.findBetween(from, to),
    listEvents(from, to),
    loadPauses()
  ]);
  const taskById = new Map(tasks.map(t => [t.id, t]));
  const generated = new Set(days.filter(d => d.generated).map(d => d.date));

  const cells = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const s = summaries[date];
    let items = (s?.instances ?? [])
      .filter(i => i.status !== 'moved' && taskById.has(i.taskId))
      .map(i => ({ icon: taskById.get(i.taskId).icon, status: i.status }));

    if (date > today && !generated.has(date)) {
      const regular = new Set((s?.instances ?? []).filter(i => !i.carried).map(i => i.taskId));
      for (const t of tasks) if (isActive(pauses, t, date) && !regular.has(t.id)) items.push({ icon: t.icon, status: 'pending' });
    }

    cells.push({
      date,
      inMonth: date >= first && date <= last,
      isToday: date === today,
      status: date > today ? 'future' : s?.status ?? 'empty',
      paused: !!pauseOn(pauses, date),
      items,
      events: events.filter(e => e.date === date).map(e => ({ icon: e.icon, label: e.label, from: e.from }))
    });
  }
  return { year, month, cells };
}
