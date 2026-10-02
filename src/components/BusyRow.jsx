import { fromMin } from '../lib/format.js';

export default function BusyRow({ block, end, onEdit }) {
  return (
    <div className="task busy">
      <div className="ic" aria-hidden="true">{block.icon}</div>
      <div className="body">
        <div className="name">{block.label}</div>
        <div className="meta">Ocupado hasta las {fromMin(end)}</div>
      </div>
      {onEdit && <button className="btn ghost sm" onClick={() => onEdit(block)}>Editar</button>}
    </div>
  );
}
