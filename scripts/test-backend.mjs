/**
 * Prueba del backend en Node, sin móvil: npm run test:backend
 * Usa sql.js en memoria y un reloj falso para simular varios días.
 */
import initSqlJs from 'sql.js';
import { createSqlJsAdapter } from '../src/backend/db/adapters/sqljsAdapter.js';
import { api } from '../src/backend/api.js';
import { setClock } from '../src/backend/utils/clock.js';

let failures = 0;
const check = (label, condition, extra = '') => {
  console.log(`${condition ? '✔' : '✘'} ${label}${extra ? `  (${extra})` : ''}`);
  if (!condition) failures++;
};
const expectError = async (label, fn, code) => {
  try { await fn(); check(label, false, 'no lanzó error'); }
  catch (e) { check(label, e.code === code, e.message); }
};

// Lunes 5 de octubre de 2026 a las 10:00
let fake = new Date(2026, 9, 5, 10, 0);
setClock(() => new Date(fake));
const goTo = (y, m, d, h = 10, min = 0) => { fake = new Date(y, m, d, h, min); };

const SQL = await initSqlJs();
await api.init({ adapter: createSqlJsAdapter(SQL) });

// --- Tareas y planificación ---
await api.loadExampleTasks();
let today = await api.today();
check('Lunes: 5 tareas (gimnasio incluido)', today.all.length === 5, today.all.map(i => i.task.name).join(', '));
check('Todas colocadas en huecos', today.schedule.slots.length === 5);

await api.createBusy({ label: 'Bootcamp', icon: '🎓', from: '09:00', to: '15:00', days: [1, 2, 3, 4, 5] });
today = await api.today();
const conflicts = today.schedule.slots.filter(s => s.start < 15 * 60 && s.end > 9 * 60);
check('Nada se planifica durante el bootcamp', conflicts.length === 0);

// --- Completar y deshacer ---
const fregar = today.all.find(i => i.task.name === 'Fregar los platos');
let r = await api.completeTask(fregar.id);
check('Fregar suma 10', r.points === 10 && r.balance === 10);
r = await api.undoTask(fregar.id);
check('Deshacer resta 10', r.balance === 0);
await api.completeTask(fregar.id);
const gym = today.all.find(i => i.task.name === 'Ir al gimnasio');
await api.completeTask(gym.id);
check('Saldo 40 tras fregar + gimnasio', (await api.balance()) === 40);

// --- Aplazar a mañana ---
const lavadora = today.all.find(i => i.task.name === 'Poner la lavadora');
check('La lavadora se puede pasar a mañana', await api.canMoveToTomorrow(lavadora.id));
await api.moveToTomorrow(lavadora.id);
const paseo = today.all.find(i => i.task.name === 'Salir a dar un paseo');
await expectError('El paseo (diario) no se puede pasar a mañana', () => api.moveToTomorrow(paseo.id), 'DUE_TOMORROW');

// --- Cambio de día: lo no hecho resta ---
goTo(2026, 9, 6, 9, 0);
const notice = await api.refresh();
check('Aviso con lo que no hiciste el lunes', notice?.items.length === 2, notice?.items.map(i => `${i.name} -${i.lost}`).join(', '));
check('Saldo 40 - 10 (paseo) - 3 (cama) = 27', (await api.balance()) === 27);
today = await api.today();
check('La lavadora aparece hoy como aplazada', today.all.some(i => i.task.name === 'Poner la lavadora' && i.carried === 1));

// --- Comodín ---
let wc = await api.useWildcard();
check('Comodín activado', wc.activeToday && wc.available === 0);
await expectError('Segundo comodín en la misma semana', () => api.useWildcard(), 'ALREADY_ACTIVE');
goTo(2026, 9, 7, 9, 0);
await api.refresh();
check('Con comodín no se pierde nada', (await api.balance()) === 27);
await expectError('No quedan comodines esta semana', () => api.useWildcard(), 'NO_WILDCARDS');

// --- Recompensas ---
const rewardId = await api.createReward({ name: 'Pedir pizza', icon: '🍕', cost: 20 });
r = await api.redeemReward(rewardId);
check('Canjear pizza deja 7 puntos', r.balance === 7);
await expectError('No llega para otra pizza', () => api.redeemReward(rewardId), 'INSUFFICIENT_POINTS');

// --- Méritos y calendario ---
const merits = await api.merits();
const st = d => merits.wall.find(c => c.date === d)?.status;
check('Lunes en el muro: a medias', st('2026-10-05') === 'partial');
check('Martes en el muro: comodín', st('2026-10-06') === 'wildcard');
check('Medalla de recompensa desbloqueada', merits.medals.find(m => m.id === 'reward').unlocked);
const month = await api.month(2026, 9);
check('Calendario de octubre con 35 casillas', month.cells.length === 35, String(month.cells.length));

// --- Validaciones ---
await expectError('Tarea sin nombre', () => api.createTask({ name: ' ', points: 10, freq: { type: 'daily' } }), 'NAME_REQUIRED');
await expectError('Horario al revés', () => api.createBusy({ from: '15:00', to: '09:00', days: [1] }), 'INVALID_RANGE');

console.log(failures ? `\n${failures} prueba(s) fallida(s)` : '\nTodo correcto');
process.exit(failures ? 1 : 0);
