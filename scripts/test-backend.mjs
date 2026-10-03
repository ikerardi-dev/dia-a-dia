/**
 * Prueba del backend en Node, sin móvil: npm run test:backend
 * Usa sql.js en memoria y un reloj falso para simular varios días.
 */
import initSqlJs from 'sql.js';
import { createSqlJsAdapter } from '../src/backend/db/adapters/sqljsAdapter.js';
import { api } from '../src/backend/api.js';
import { setClock } from '../src/backend/utils/clock.js';
import { initDatabase, getDb } from '../src/backend/db/database.js';
import { MIGRATIONS } from '../src/backend/db/schema.js';

let failures = 0;
const toMinutes = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
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

// --- Fecha de inicio, tareas de una vez y sin fecha (miércoles 7) ---
const base = { icon: '📮', points: 10, pref: 'manana', duration: 20 };
await api.createTask({ ...base, name: 'Ir a Correos', freq: { type: 'once' }, startDate: '2026-10-08' });
await api.createTask({ ...base, name: 'Regar', freq: { type: 'interval', every: 2 }, startDate: '2026-10-09' });
await api.createTask({ ...base, name: 'Sacar la basura', points: 5, freq: { type: 'anytime' } });
await expectError('Fecha anterior a hoy', () => api.createTask({ ...base, name: 'X', freq: { type: 'once' }, startDate: '2026-10-01' }), 'PAST_DATE');

today = await api.today();
check('Correos no aparece hoy', !today.all.some(i => i.task.name === 'Ir a Correos'));
check('Regar aún no ha empezado', !today.all.some(i => i.task.name === 'Regar'));
check('La basura sale en "Cuando puedas"', today.anytime.some(t => t.name === 'Sacar la basura'));
const jueves = await api.day('2026-10-08');
check('Correos aparece el jueves', jueves.all.some(i => i.task.name === 'Ir a Correos'));
const viernes = await api.day('2026-10-09');
check('Regar empieza el viernes', viernes.all.some(i => i.task.name === 'Regar'));
check('Regar no toca el sábado', !(await api.day('2026-10-10')).all.some(i => i.task.name === 'Regar'));

const basura = today.anytime.find(t => t.name === 'Sacar la basura');
const before = await api.balance();
r = await api.completeAnytime(basura.id);
check('La basura suma 5', r.balance === before + 5);
today = await api.today();
check('Ya no está en "Cuando puedas"', !today.anytime.length);
const doneBasura = today.done.find(i => i.task.name === 'Sacar la basura');
check('Aparece en "Hecho hoy"', !!doneBasura);
await api.undoTask(doneBasura.id);
today = await api.today();
check('Deshacer la devuelve a "Cuando puedas"', today.anytime.length === 1 && (await api.balance()) === before);

goTo(2026, 9, 9, 9, 0); // viernes: Correos (jueves) se quedó sin hacer
await api.refresh();
today = await api.today();
check('Correos no hecho pasa al viernes como aplazada', today.all.some(i => i.task.name === 'Ir a Correos' && i.carried === 1));
check('La basura sigue esperando sin restar', today.anytime.length === 1);
const correosEnTareas = (await api.tasks()).find(t => t.name === 'Ir a Correos');
check('Correos aplazada sigue en Tareas', !!correosEnTareas && correosEnTareas.postponed);

// --- Eventos (viernes 9) ---
const padel = await api.createBusy({ label: 'Pádel', icon: '⚽', from: '19:00', to: '20:30', date: '2026-10-10', reminder: 30, syncCalendar: true });
const oct = await api.month(2026, 9);
check('El pádel sale en el calendario del sábado', oct.cells.find(c => c.date === '2026-10-10').events.some(e => e.label === 'Pádel'));
let items = await api.calendarItems();
let padelItem = items.find(i => i.kind === 'busy' && i.id === padel);
check('El pádel se enviará al móvil con aviso 30 min antes', padelItem?.wanted && padelItem.alerts[0] === -30);
await api.setCalendarLink('busy', padel, 'cal-1', padelItem.hash);
padelItem = (await api.calendarItems()).find(i => i.id === padel && i.kind === 'busy');
check('Tras enviarlo, no hay cambios pendientes', padelItem.hash === padelItem.savedHash);
const sabado = await api.day('2026-10-10');
check('Las tareas del sábado esquivan el pádel', sabado.schedule.slots.every(sl => sl.end <= 19 * 60 || sl.start >= 20.5 * 60));
await api.deleteBusy(padel);
padelItem = (await api.calendarItems()).find(i => i.id === padel && i.kind === 'busy');
check('Al borrarlo, se quitará del móvil', padelItem && !padelItem.wanted && padelItem.eventId === 'cal-1');
await expectError('Aviso no válido', () => api.createBusy({ from: '10:00', to: '11:00', date: '2026-10-10', reminder: 7 }), 'INVALID_REMINDER');

// --- Tiempo máximo al día ---
await api.updateSettings({ maxTaskMinutes: 150 });
today = await api.today();
const gymMoved = today.moved.find(i => i.task.name === 'Ir al gimnasio');
check('Con límite de 2 h 30 min, el gimnasio se reparte a otro día', gymMoved?.autoMoved && gymMoved.movedTo === '2026-10-10', gymMoved?.movedTo);
check('Hoy queda dentro del límite', today.plannedMinutes <= 150, String(today.plannedMinutes));
check('Las diarias no se mueven', today.all.some(i => i.task.name === 'Fregar los platos' && i.status === 'pending'));
const sat = await api.day('2026-10-10');
check('El sábado aparece el gimnasio repartido', sat.all.some(i => i.task.name === 'Ir al gimnasio' && i.autoMoved));
today = await api.today();
check('Volver a abrir Hoy no mueve nada más', today.moved.filter(i => i.autoMoved).length === 1);
await api.updateSettings({ maxTaskMinutes: 0 });

// --- Tarea de una vez enviada al móvil ---
const dentista = await api.createTask({ name: 'Dentista', icon: '🦷', points: 10, freq: { type: 'once' }, startDate: '2026-10-12', time: '10:00', duration: 45, syncCalendar: true });
items = await api.calendarItems();
const dent = items.find(i => i.kind === 'task' && i.id === dentista);
check('La tarea de una vez se envía con su hora', dent?.wanted && dent.from === '10:00' && dent.to === '10:45' && !dent.allDay);

// --- Cambiar la hora a mano (viernes 9, 9:00) ---
today = await api.today();
const paseoSlot = today.schedule.slots.find(sl => sl.task.name === 'Salir a dar un paseo');
await api.setTaskTime(paseoSlot.id, 17 * 60 + 30);
today = await api.today();
const paseoMovido = today.schedule.slots.find(sl => sl.id === paseoSlot.id);
check('El paseo queda exactamente a las 17:30', paseoMovido.start === 17 * 60 + 30 && paseoMovido.pinnedStart === 1050);
check('Nada se solapa con el paseo', today.schedule.slots.filter(sl => sl.id !== paseoSlot.id)
  .every(sl => sl.end <= 1050 || sl.start >= 1050 + 40));
await expectError('Hora no válida', () => api.setTaskTime(paseoSlot.id, 24 * 60), 'INVALID_TIME');

const fregarSlot = today.schedule.slots.find(sl => sl.task.name === 'Fregar los platos');
r = await api.postponeLater(fregarSlot.id, fregarSlot.start);
check('Aplazar 1 h cuenta desde su hora planificada', toMinutes(r.start) === Math.ceil((fregarSlot.start + 60) / 5) * 5, `${fregarSlot.start} -> ${r.start}`);
await api.clearTaskTime(paseoSlot.id);
today = await api.today();
check('Hora automática: vuelve a colocarse sola', today.schedule.slots.find(sl => sl.id === paseoSlot.id).pinnedStart === null);

// --- Nota del día ---
goTo(2026, 9, 9, 10, 0);
let pending = await api.pendingRating();
check('A las 10:00 pregunta por ayer (jueves)', pending?.date === '2026-10-08' && !pending.isToday, JSON.stringify(pending));
await api.snoozeRating();
check('"Más tarde" no vuelve a preguntar antes de 1 hora', (await api.pendingRating()) === null);
goTo(2026, 9, 9, 11, 1);
check('Pasada la hora vuelve a preguntar', (await api.pendingRating())?.date === '2026-10-08');
await api.rateDay('2026-10-08', 7.5);
check('Valorado ayer: hasta la noche no pregunta', (await api.pendingRating()) === null);
goTo(2026, 9, 9, 21, 31); // termina a las 23:00 → desde las 21:30
pending = await api.pendingRating();
check('Hora y media antes de terminar pregunta por hoy', pending?.date === '2026-10-09' && pending.isToday);
await api.rateDay('2026-10-09', 4);
await expectError('Nota con decimales raros', () => api.rateDay('2026-10-07', 6.3), 'INVALID_SCORE');
await expectError('Nota mayor que 10', () => api.rateDay('2026-10-07', 10.5), 'INVALID_SCORE');
await expectError('Día que aún no ha llegado', () => api.rateDay('2026-10-20', 5), 'FUTURE_DATE');
await api.rateDay('2026-10-09', 5.5);
const meritsR = await api.merits();
check('Media de notas (7,5 y 5,5) = 6,5', meritsR.rating.average === 6.5 && meritsR.rating.count === 2, JSON.stringify(meritsR.rating));
check('La nota sale en el muro', meritsR.wall.find(c => c.date === '2026-10-08').rating === 7.5);
check('La nota sale en la vista del día', (await api.day('2026-10-09')).rating === 5.5);
goTo(2026, 9, 9, 9, 0);

// --- Peticiones a la vez (como a medianoche) ---
{
  const { getDb: db } = await import('../src/backend/db/database.js');
  goTo(2026, 9, 11, 0, 5);
  await Promise.all([api.refresh(), api.today(), api.today(), api.day('2026-10-11'), api.pendingRating(), api.day('2026-10-12')]);
  const dups = await db().all(`SELECT task_id, COUNT(*) n FROM task_instances
    WHERE date = '2026-10-11' AND carried = 0 AND auto_moved = 0 GROUP BY task_id HAVING n > 1`);
  check('Pedir el día a la vez no duplica tareas', dups.length === 0, `${dups.length} duplicadas`);

  // Dos semanas sin abrir la app: solo restan los 3 últimos días
  goTo(2026, 9, 25, 10, 0);
  await api.refresh();
  const days = await db().all(`SELECT DISTINCT date FROM points_ledger WHERE kind = 'task_missed' AND date > '2026-10-11' ORDER BY date`);
  check('Tras 2 semanas sin abrirla, solo restan 3 días', days.map(d => d.date).join(',') === '2026-10-22,2026-10-23,2026-10-24', days.map(d => d.date).join(','));
  goTo(2026, 9, 9, 9, 0);
}

// --- Pausa (vacaciones): domingo 25 de octubre ---
{
  goTo(2026, 9, 25, 10, 0);
  await api.refresh();
  const tareas = await api.tasks();
  const fregar = tareas.find(t => t.name === 'Fregar los platos');
  const repetitivas = tareas.filter(t => ['daily', 'interval', 'weekdays'].includes(t.freq.type));
  // Todas en pausa del 25 al 28 menos fregar
  const pid = await api.createPause({ label: 'Vacaciones', from: '2026-10-25', to: '2026-10-28',
    taskIds: repetitivas.filter(t => t.id !== fregar.id).map(t => t.id) });
  today = await api.today();
  check('En pausa: hoy solo queda fregar (también sin las aplazadas)', today.all.filter(i => i.status === 'pending').every(i => i.task.name === 'Fregar los platos'),
    today.all.filter(i => i.status === 'pending').map(i => i.task.name).join(','));
  check('La vista del día sabe que está en pausa', today.pause?.label === 'Vacaciones');
  const lunes = await api.day('2026-10-26');
  check('Mañana en pausa solo toca fregar', lunes.all.every(i => i.task.name === 'Fregar los platos'), lunes.all.map(i => i.task.name).join(','));

  // Reactivar el paseo a mitad de la pausa
  const paseo = repetitivas.find(t => t.name === 'Salir a dar un paseo');
  const p = (await api.pauses()).find(x => x.id === pid);
  await api.updatePause(pid, { ...p, taskIds: p.taskIds.filter(id => id !== paseo.id) });
  today = await api.today();
  check('Reactivar el paseo lo devuelve a hoy', today.all.some(i => i.task.name === 'Salir a dar un paseo' && i.status === 'pending'));

  // Pasan los días de pausa sin hacer nada salvo... nada: solo resta lo activo
  const antes = await api.balance();
  goTo(2026, 9, 27, 10, 0);
  await api.refresh();
  const restado = antes - (await api.balance());
  check('En pausa solo restan las tareas activas (fregar 5 + paseo 10, dos días)', restado === 30, String(restado));

  // Todo en pausa: el día sale como pausado y no rompe la racha
  const p2 = (await api.pauses()).find(x => x.id === pid);
  await api.updatePause(pid, { ...p2, taskIds: repetitivas.map(t => t.id) });
  goTo(2026, 9, 28, 10, 0);
  await api.refresh();
  const wallP = (await api.merits()).wall.find(c => c.date === '2026-10-27');
  check('Un día con todo en pausa sale como pausado', wallP.status === 'paused', wallP.status);
  await expectError('Pausa sin tareas', () => api.createPause({ from: '2026-11-01', to: '2026-11-02', taskIds: [] }), 'NO_TASKS');
  await expectError('Pausa que acaba antes de empezar', () => api.createPause({ from: '2026-11-05', to: '2026-11-02', taskIds: [fregar.id] }), 'INVALID_RANGE');

  // Quitar la pausa en curso: se termina ayer y hoy vuelve todo
  await api.deletePause(pid);
  today = await api.today();
  check('Al quitar la pausa, hoy vuelven las tareas', today.all.some(i => i.task.name === 'Hacer la cama' && i.status === 'pending'));
  check('La pausa quitada ya no sale en la lista', (await api.pauses()).length === 0);
  check('Pero los días que estuvo en pausa siguen marcados', (await api.merits()).wall.find(c => c.date === '2026-10-27').status === 'paused');
  goTo(2026, 9, 9, 9, 0);
}

// --- Validaciones ---
await expectError('Tarea sin nombre', () => api.createTask({ name: ' ', points: 10, freq: { type: 'daily' } }), 'NAME_REQUIRED');
await expectError('Horario al revés', () => api.createBusy({ from: '15:00', to: '09:00', days: [1] }), 'INVALID_RANGE');

// --- Migración desde la versión 1 (una base de datos como la que ya tienes en el móvil) ---
{
  const legacy = createSqlJsAdapter(SQL);
  await legacy.exec('PRAGMA foreign_keys = ON;');
  await legacy.exec('CREATE TABLE schema_version (version INTEGER NOT NULL); INSERT INTO schema_version VALUES (1);');
  await legacy.exec(MIGRATIONS[1]);
  await legacy.exec(`
    INSERT INTO tasks (id, name, icon, points, freq_type, pref, duration, start_date)
      VALUES (7, 'Fregar', '🍽️', 10, 'daily', 'noche', 20, '2026-10-01');
    INSERT INTO days (date, generated) VALUES ('2026-10-01', 1);
    INSERT INTO task_instances (id, task_id, date, status) VALUES (1, 7, '2026-10-01', 'done');
    INSERT INTO points_ledger (date, amount, kind, instance_id) VALUES ('2026-10-01', 10, 'task_done', 1);
  `);
  await initDatabase(legacy);
  const v = await getDb().get('SELECT version FROM schema_version');
  const t = await getDb().get('SELECT * FROM tasks WHERE id = 7');
  const fk = await getDb().all('PRAGMA foreign_key_check');
  const points = await getDb().get('SELECT SUM(amount) AS s FROM points_ledger');
  check('Migración: versión 6', v.version === 6);
  check('Migración: la tarea se conserva', t?.name === 'Fregar' && t.completed_at === null);
  check('Migración: historial y puntos intactos', points.s === 10 && fk.length === 0);
  await getDb().run("INSERT INTO tasks (name, icon, points, freq_type, start_date) VALUES ('Basura', '🗑️', 5, 'anytime', '2026-10-02')");
  check('Migración: acepta tareas sin fecha', (await getDb().get("SELECT COUNT(*) AS n FROM tasks WHERE freq_type = 'anytime'")).n === 1);
  const seq = await getDb().get("SELECT id FROM tasks WHERE name = 'Basura'");
  check('Migración: los ids siguen después del último', seq.id === 8);
}

console.log(failures ? `\n${failures} prueba(s) fallida(s)` : '\nTodo correcto');
process.exit(failures ? 1 : 0);
