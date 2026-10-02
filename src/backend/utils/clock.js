// Fuente única de "ahora". En los tests se sustituye para simular otros días.
let nowFn = () => new Date();

export const now = () => nowFn();
export const setClock = fn => { nowFn = fn; };
export const resetClock = () => { nowFn = () => new Date(); };
