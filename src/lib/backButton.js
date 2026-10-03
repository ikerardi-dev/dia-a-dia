/**
 * Botón "atrás" de Android. Las ventanas y menús abiertos se apuntan en una
 * pila; al pulsar atrás se cierra el último que se abrió.
 */
const handlers = [];

/** Apunta un cierre. Devuelve la función para quitarlo. */
export function pushBackHandler(fn) {
  handlers.push(fn);
  return () => {
    const i = handlers.lastIndexOf(fn);
    if (i >= 0) handlers.splice(i, 1);
  };
}

/** Ejecuta el último cierre apuntado. Devuelve false si no había ninguno. */
export function runBackHandler() {
  const fn = handlers[handlers.length - 1];
  if (!fn) return false;
  fn();
  return true;
}
