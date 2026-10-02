import { useEffect, useState } from 'react';
import {
  notificationsSupported, getPermission, requestPermission,
  hasExactAlarms, openExactAlarmSettings, sendTestNotification, rescheduleReminders
} from '../lib/notifications.js';

/** Activar y probar los avisos del sistema */
export default function NotificationSettings({ enabled, onToggle, toast }) {
  const supported = notificationsSupported();
  const [permission, setPermission] = useState(null);
  const [exact, setExact] = useState(true);

  const refresh = async () => {
    setPermission(await getPermission());
    setExact(await hasExactAlarms());
  };
  useEffect(() => { if (supported) refresh(); }, [supported]);

  if (!supported) {
    return (
      <div className="setting-row">
        <div><b>Avisos</b><p className="sub">Funcionan en la app instalada en el móvil.</p></div>
      </div>
    );
  }

  const enable = async () => {
    const result = await requestPermission();
    setPermission(result);
    if (result === 'granted') {
      const res = await onToggle(true);
      if (res.ok) await rescheduleReminders();
    } else {
      toast('Android no ha dado permiso. Actívalo en Ajustes > Apps > Día a Día > Notificaciones.', 6000);
    }
  };

  const disable = async () => {
    const res = await onToggle(false);
    if (res.ok) await rescheduleReminders();
  };

  const active = enabled && permission === 'granted';

  return (
    <>
      <div className="setting-row">
        <div>
          <b>Avisos</b>
          <p className="sub">
            {active
              ? 'Te aviso cuando toque cada tarea, aunque la app esté cerrada.'
              : permission === 'denied'
                ? 'Android tiene los avisos bloqueados para esta app.'
                : 'Te aviso cuando toque cada tarea.'}
          </p>
        </div>
        {active
          ? <button className="btn sm" onClick={disable}>Desactivar</button>
          : <button className="btn sm primary" onClick={enable}>Activar</button>}
      </div>

      {active && (
        <div className="setting-row">
          <div>
            <b>Hora exacta</b>
            <p className="sub">
              {exact ? 'Los avisos llegan a su hora.' : 'Sin este permiso los avisos pueden llegar unos minutos tarde.'}
            </p>
          </div>
          {exact
            ? <button className="btn sm" onClick={() => sendTestNotification().then(() => toast('Te llegará un aviso en 5 segundos.'))}>Probar aviso</button>
            : <button className="btn sm" onClick={() => openExactAlarmSettings().then(refresh)}>Permitir</button>}
        </div>
      )}
    </>
  );
}
