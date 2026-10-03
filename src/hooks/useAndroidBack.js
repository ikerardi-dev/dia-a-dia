import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { runBackHandler } from '../lib/backButton.js';

/**
 * Atrás en Android: cierra la ventana o menú abierto; si no hay ninguno,
 * vuelve a Hoy; y si ya estás en Hoy, sale de la app.
 */
export function useAndroidBack(view, goHome) {
  const state = useRef({ view, goHome });
  state.current = { view, goHome };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let listener = null;
    CapacitorApp.addListener('backButton', () => {
      if (runBackHandler()) return;
      if (state.current.view !== 'hoy') state.current.goHome();
      else CapacitorApp.exitApp();
    }).then(l => { listener = l; });
    return () => listener?.remove();
  }, []);
}
