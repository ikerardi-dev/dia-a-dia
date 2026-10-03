import { parseYmd } from '../backend/utils/dates.js';

export { fromMin, todayStr, nowMinutes, addDays } from '../backend/utils/dates.js';

export const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DOW_SHORT = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 0: 'D' };
/** Orden de la semana empezando en lunes (0 = domingo en JavaScript) */
export const WEEK = [1, 2, 3, 4, 5, 6, 0];
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const longDate = s => {
  const d = parseYmd(s);
  return `${DOW[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
};

export const shortDate = s => {
  const d = parseYmd(s);
  return `${DOW[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
};

export const duration = minutes => {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
};

export const fmt = n => n.toLocaleString('es-ES');
export const signed = n => (n > 0 ? `+${fmt(n)}` : fmt(n));

/** "Ir a Correos" → "ir a Correos". Si empieza por siglas ("DNI…"), no lo toca. */
export const lowerFirst = text => {
  if (!text) return text;
  const [first, second] = text;
  if (second && second === second.toUpperCase() && second !== second.toLowerCase()) return text;
  return first.toLowerCase() + text.slice(1);
};

export const joinNatural = list =>
  list.length <= 1 ? list[0] ?? '' : `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}`;
