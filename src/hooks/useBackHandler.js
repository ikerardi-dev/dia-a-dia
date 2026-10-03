import { useEffect, useRef } from 'react';
import { pushBackHandler } from '../lib/backButton.js';

/** Mientras `active` sea true, el botón atrás llama a `onBack` */
export function useBackHandler(active, onBack) {
  const callback = useRef(onBack);
  callback.current = onBack;

  useEffect(() => {
    if (!active) return undefined;
    return pushBackHandler(() => callback.current());
  }, [active]);
}
