import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { formatScore, scoreStyle } from '../lib/rating.js';
import { longDate } from '../lib/format.js';

/**
 * Valorar un día de 0 a 10 arrastrando la barra (de medio en medio punto).
 * auto = la ha abierto la app sola: entonces ofrece "Preguntar más tarde".
 */
export default function RatingSheet({ date, isToday, initial, auto, onSave, onLater, onClose }) {
  const [score, setScore] = useState(initial ?? 5);
  const [saving, setSaving] = useState(false);

  const title = isToday ? '¿Qué tal ha ido hoy?' : auto ? '¿Qué tal fue ayer?' : 'Nota del día';

  const save = async () => {
    setSaving(true);
    await onSave(score);
  };

  return (
    <Sheet title={title} onClose={auto ? onLater : onClose}>
      <p className="sub rating-date">{longDate(date)}</p>

      <div className="rating-value" style={scoreStyle(score)} aria-live="polite">{formatScore(score)}</div>

      <input
        className="rating-slider"
        type="range"
        min={0}
        max={10}
        step={0.5}
        value={score}
        aria-label="Nota del día, de 0 a 10"
        aria-valuetext={formatScore(score)}
        onChange={e => setScore(Number(e.target.value))}
      />

      <div className="actions">
        {auto
          ? <button type="button" className="btn" onClick={onLater}>Preguntar más tarde</button>
          : <button type="button" className="btn" onClick={onClose}>Cancelar</button>}
        <button type="button" className="btn primary" disabled={saving} onClick={save}>Aceptar</button>
      </div>
    </Sheet>
  );
}
