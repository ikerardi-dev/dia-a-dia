import { useEffect } from 'react';
import { syncPhoneCalendar } from '../lib/phoneCalendar.js';

/** Tras cada cambio, envía al calendario del móvil lo que esté marcado */
export function usePhoneCalendar(ready, version) {
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(syncPhoneCalendar, 1000);
    return () => clearTimeout(id);
  }, [ready, version]);
}
