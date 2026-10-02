import { useEffect } from 'react';
import { rescheduleReminders } from '../lib/notifications.js';

/** Cada vez que cambian los datos, recalcula los avisos (con una pequeña espera) */
export function useReminders(ready, version) {
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(rescheduleReminders, 800);
    return () => clearTimeout(id);
  }, [ready, version]);
}
