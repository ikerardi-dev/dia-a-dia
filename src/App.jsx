import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './backend/api.js';
import { boot } from './lib/boot.js';
import { useToasts } from './hooks/useToasts.js';
import { useClock } from './hooks/useClock.js';
import { useReminders } from './hooks/useReminders.js';
import { usePhoneCalendar } from './hooks/usePhoneCalendar.js';
import { useAndroidBack } from './hooks/useAndroidBack.js';

import Header from './components/Header.jsx';
import TabBar from './components/TabBar.jsx';
import Toasts from './components/Toasts.jsx';
import ConfirmSheet from './components/ConfirmSheet.jsx';
import TaskForm from './forms/TaskForm.jsx';
import BusyForm from './forms/BusyForm.jsx';
import RewardForm from './forms/RewardForm.jsx';
import RatingSheet from './components/RatingSheet.jsx';
import PauseForm from './forms/PauseForm.jsx';
import { formatScore } from './lib/rating.js';

import TodayView from './views/TodayView.jsx';
import CalendarView from './views/CalendarView.jsx';
import TasksView from './views/TasksView.jsx';
import RewardsView from './views/RewardsView.jsx';
import MeritsView from './views/MeritsView.jsx';

const VIEWS = {
  hoy: TodayView,
  calendario: CalendarView,
  tareas: TasksView,
  premios: RewardsView,
  meritos: MeritsView
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState(null);
  const [view, setView] = useState('hoy');
  const [version, setVersion] = useState(0);
  const [balance, setBalance] = useState(null);
  const [modal, setModal] = useState(null);
  const [toasts, toast] = useToasts();

  const refresh = useCallback(() => setVersion(v => v + 1), []);

  useEffect(() => {
    boot().then(() => setReady(true)).catch(err => setFatal(err.message));
  }, []);

  useEffect(() => {
    if (ready) api.balance().then(setBalance);
  }, [ready, version]);

  // Al cambiar de día se cierra el anterior (resta lo no hecho y aplaza)
  const minute = useClock(() => api.refresh().then(refresh));

  // Avisos del sistema: se recalculan cada vez que cambian los datos
  useReminders(ready, version);
  // Calendario del móvil: envía los eventos y tareas marcados
  usePhoneCalendar(ready, version);

  // Encuesta del día: al abrir la app, al volver a ella y cada 30 segundos
  useEffect(() => {
    if (!ready || modal) return;
    let alive = true;
    api.pendingRating().then(pending => {
      if (alive && pending) setModal({ type: 'rating', ...pending, auto: true, initial: null });
    });
    return () => { alive = false; };
  }, [ready, minute, version, modal]);

  /** Ejecuta una acción del backend y recarga. Devuelve { ok, result | error } */
  const mutate = useCallback(async (fn, okMessage) => {
    try {
      const result = await fn();
      refresh();
      if (okMessage) toast(typeof okMessage === 'function' ? okMessage(result) : okMessage);
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: err?.message || 'Algo ha fallado.' };
    }
  }, [refresh, toast]);

  /** Igual que mutate, pero si falla lo muestra como aviso */
  const act = useCallback(async (fn, okMessage) => {
    const res = await mutate(fn, okMessage);
    if (!res.ok) toast(res.error);
    return res;
  }, [mutate, toast]);

  const close = useCallback(() => setModal(null), []);

  const open = useMemo(() => ({
    task: task => setModal({ type: 'task', task }),
    busy: (block, date) => setModal({ type: 'busy', block, date }),
    reward: reward => setModal({ type: 'reward', reward }),
    confirm: options => setModal({ type: 'confirm', ...options }),
    pause: pause => setModal({ type: 'pause', pause }),
    rating: (date, current, isToday = false) => setModal({ type: 'rating', date, isToday, auto: false, initial: current })
  }), []);

  /* ---------- Guardado desde los formularios ---------- */

  const saveFrom = async (fn, okMessage) => {
    const res = await mutate(fn, okMessage);
    if (res.ok) close();
    return res.ok ? null : res.error;
  };

  const saveTask = (task, data) =>
    saveFrom(() => (task ? api.updateTask(task.id, data) : api.createTask(data)), task ? 'Tarea guardada.' : 'Tarea creada.');

  const saveBusy = (block, data) =>
    saveFrom(() => (block ? api.updateBusy(block.id, data) : api.createBusy(data)), data.date ? 'Evento guardado.' : 'Guardado. Tus tareas se han recolocado en los huecos libres.');

  const saveReward = (reward, data) =>
    saveFrom(() => (reward ? api.updateReward(reward.id, data) : api.createReward(data)), reward ? 'Recompensa guardada.' : 'Recompensa creada.');

  const savePause = (pause, data) =>
    saveFrom(() => (pause ? api.updatePause(pause.id, data) : api.createPause(data)), pause ? 'Pausa guardada.' : 'Pausa creada. Disfruta 🏖️');

  const askDelete = (title, fn, okMessage, text = 'Tu historial se conserva.') =>
    open.confirm({ title, text, confirmLabel: 'Eliminar', danger: true, onConfirm: () => act(fn, okMessage) });

  const goTo = useCallback(v => { setView(v); window.scrollTo(0, 0); }, []);
  useAndroidBack(view, () => goTo('hoy'));

  const View = VIEWS[view];

  return (
    <>
      <div className="shell">
        <Header balance={balance} />
        <main>
          {fatal && <p className="sub">No se pudo abrir la base de datos: {fatal}</p>}
          {!fatal && !ready && <p className="loading">Cargando…</p>}
          {ready && <View version={version} minute={minute} act={act} open={open} toast={toast} />}
        </main>
      </div>

      <TabBar view={view} onChange={goTo} />
      <Toasts toasts={toasts} />

      {modal?.type === 'task' && (
        <TaskForm
          task={modal.task}
          toast={toast}
          onClose={close}
          onSave={data => saveTask(modal.task, data)}
          onDelete={() => askDelete(`¿Eliminar "${modal.task.name}"?`, () => api.deleteTask(modal.task.id), 'Tarea eliminada.')}
        />
      )}
      {modal?.type === 'busy' && (
        <BusyForm
          block={modal.block}
          toast={toast}
          presetDate={modal.date}
          onClose={close}
          onSave={data => saveBusy(modal.block, data)}
          onDelete={() => askDelete(
            `¿Eliminar "${modal.block.label}"?`,
            () => api.deleteBusy(modal.block.id),
            modal.block.date ? 'Evento eliminado.' : 'Horario eliminado.',
            modal.block.syncCalendar ? 'También se quitará del calendario del móvil.' : 'Las tareas volverán a poder ocupar ese hueco.'
          )}
        />
      )}
      {modal?.type === 'reward' && (
        <RewardForm
          reward={modal.reward}
          onClose={close}
          onSave={data => saveReward(modal.reward, data)}
          onDelete={() => askDelete(`¿Eliminar "${modal.reward.name}"?`, () => api.deleteReward(modal.reward.id), 'Recompensa eliminada.')}
        />
      )}
      {modal?.type === 'pause' && (
        <PauseForm
          pause={modal.pause}
          onClose={close}
          onSave={data => savePause(modal.pause, data)}
          onDelete={() => askDelete(
            `¿Quitar "${modal.pause.label}"?`,
            () => api.deletePause(modal.pause.id),
            'Pausa quitada. Tus tareas vuelven a contar.',
            'Desde hoy tus tareas vuelven a contar. Los días que ya estuvieron en pausa siguen igual.'
          )}
        />
      )}
      {modal?.type === 'confirm' && <ConfirmSheet {...modal} onClose={close} />}
      {modal?.type === 'rating' && (
        <RatingSheet
          key={modal.date}
          date={modal.date}
          isToday={modal.isToday}
          initial={modal.initial}
          auto={modal.auto}
          onClose={close}
          onLater={async () => { await api.snoozeRating(); close(); toast('Vale, te pregunto dentro de una hora.'); }}
          onSave={async score => {
            const res = await mutate(() => api.rateDay(modal.date, score), `Nota guardada: ${formatScore(score)}`);
            if (!res.ok) toast(res.error);
            close();
          }}
        />
      )}
    </>
  );
}
