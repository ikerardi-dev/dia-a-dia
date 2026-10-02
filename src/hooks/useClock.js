import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { todayStr } from '../lib/format.js';

/**
 * Avanza cada 30 segundos y al volver a la app.
 * Si ha cambiado el día, llama a onNewDay (para cerrar el día anterior).
 */
export function useClock(onNewDay) {
  const [minute, setMinute] = useState(0);
  const day = useRef(todayStr());
  const callback = useRef(onNewDay);
  callback.current = onNewDay;

  useEffect(() => {
    const tick = () => {
      const today = todayStr();
      if (today !== day.current) {
        day.current = today;
        callback.current();
      }
      setMinute(m => m + 1);
    };

    const id = setInterval(tick, 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);

    // En el APK, además, escuchamos cuando la app vuelve a primer plano
    let resumeListener = null;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('resume', tick).then(l => { resumeListener = l; });
    }

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      resumeListener?.remove();
    };
  }, []);

  return minute;
}
