import { api } from '../backend/api.js';

let starting = null;

/** Arranca el backend una sola vez (StrictMode monta los efectos dos veces) */
export const boot = () => (starting ??= api.init());
