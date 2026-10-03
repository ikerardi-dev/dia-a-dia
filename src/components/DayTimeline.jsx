import BusyRow from './BusyRow.jsx';
import TimeHandle from './TimeHandle.jsx';
import { fromMin, nowMinutes } from '../lib/format.js';

/**
 * Horario ocupado y tareas planificadas, ordenados por hora.
 * Si recibe onMoveTask, la hora de cada tarea se puede arrastrar.
 */
export default function DayTimeline({ schedule, isToday, renderTask, onEditBusy, onMoveTask }) {
  const now = isToday ? nowMinutes() : null;

  const rows = [
    ...schedule.busy.map(b => ({
      key: `b-${b.block.id}`, start: b.start, slot: null,
      element: <BusyRow block={b.block} end={b.end} onEdit={onEditBusy} />
    })),
    ...schedule.slots.map(slot => ({
      key: `t-${slot.id}`, start: slot.start, slot,
      element: renderTask(slot)
    }))
  ].sort((a, b) => a.start - b.start);

  if (!rows.length) return null;

  return (
    <div className="timeline">
      {rows.map(row => {
        const pinned = row.slot?.pinnedStart != null;
        const isNow = row.slot && now !== null && !pinned && row.start <= now + 5;
        const isLate = row.slot && now !== null && pinned && row.start < now;
        return (
          <div className="slot" key={row.key}>
            {row.slot && onMoveTask
              ? <TimeHandle start={row.start} isNow={isNow} isLate={isLate} onCommit={minutes => onMoveTask(row.slot, minutes)} />
              : <div className={`time${isNow ? ' now' : ''}${isLate ? ' late' : ''}`}>{isNow ? 'Ahora' : fromMin(row.start)}</div>}
            {row.element}
          </div>
        );
      })}
    </div>
  );
}
