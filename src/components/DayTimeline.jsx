import BusyRow from './BusyRow.jsx';
import { fromMin, nowMinutes } from '../lib/format.js';

/** Horario ocupado y tareas planificadas, ordenados por hora */
export default function DayTimeline({ schedule, isToday, renderTask, onEditBusy }) {
  const now = isToday ? nowMinutes() : null;

  const rows = [
    ...schedule.busy.map(b => ({
      key: `b-${b.block.id}`, start: b.start, isTask: false,
      element: <BusyRow block={b.block} end={b.end} onEdit={onEditBusy} />
    })),
    ...schedule.slots.map(slot => ({
      key: `t-${slot.id}`, start: slot.start, isTask: true,
      element: renderTask(slot)
    }))
  ].sort((a, b) => a.start - b.start);

  if (!rows.length) return null;

  return (
    <div className="timeline">
      {rows.map(row => {
        const isNow = row.isTask && now !== null && row.start <= now + 5;
        return (
          <div className="slot" key={row.key}>
            <div className={`time${isNow ? ' now' : ''}`}>{isNow ? 'Ahora' : fromMin(row.start)}</div>
            {row.element}
          </div>
        );
      })}
    </div>
  );
}
