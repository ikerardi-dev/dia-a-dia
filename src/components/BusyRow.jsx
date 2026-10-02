import { fromMin } from '../lib/format.js';

export default function BusyRow({ block, end, onEdit }) {
  return (
    <div className={`task busy${block.date ? ' event' : ''}`}>
      <div className="ic" aria-hidden="true">{block.icon}</div>
      <div className="body">
        <div className="name">{block.label}</div>
        <div className="meta">
          {block.date ? `Evento hasta las ${fromMin(end)}` : `Ocupado hasta las ${fromMin(end)}`}
          {block.reminder != null && ' 🔔'}{block.syncCalendar && ' 📲'}
        </div>
      </div>
      {onEdit && <button className="btn ghost sm" onClick={() => onEdit(block)}>Editar</button>}
    </div>
  );
}
