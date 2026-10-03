import { useEffect, useRef, useState } from 'react';
import { api } from '../backend/api.js';
import { useQuery } from '../hooks/useQuery.js';
import { fmt, longDate, shortDate, WEEK, DOW_SHORT } from '../lib/format.js';
import { formatScore, scoreStyle } from '../lib/rating.js';
import DayDetail from '../components/DayDetail.jsx';

const STATUS_TEXT = {
  good: 'cumplido', partial: 'a medias', bad: 'no cumplido', wildcard: 'comodín', paused: 'en pausa',
  progress: 'en curso', future: 'por llegar', empty: 'sin retos'
};

export default function MeritsView({ version, open }) {
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('tasks'); // 'tasks' | 'ratings'
  const scroller = useRef(null);
  const { data: m } = useQuery(() => api.merits(), [version]);

  // La semana actual está a la derecha: el muro empieza desplazado hasta ella
  const loaded = !!m;
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [loaded, mode]);

  if (!m) return <p className="loading">Cargando…</p>;
  const showRatings = mode === 'ratings';

  const cellLabel = c => showRatings
    ? `${longDate(c.date)}: ${c.rating !== null ? `nota ${formatScore(c.rating)}` : 'sin nota'}`
    : `${longDate(c.date)}: ${STATUS_TEXT[c.status]}${c.earned || c.lost ? `, +${c.earned} −${c.lost}` : ''}`;

  return (
    <div className="stack">
      <section className="card rating-summary">
        {m.rating.count ? (
          <>
            <span className="rating-avg" style={scoreStyle(m.rating.average)}>{formatScore(m.rating.average)}</span>
            <div>
              <b>Nota media de tus días</b>
              <p className="sub">{m.rating.count} {m.rating.count === 1 ? 'día valorado' : 'días valorados'}</p>
            </div>
          </>
        ) : (
          <div>
            <b>Nota media de tus días</b>
            <p className="sub">Aún no has valorado ningún día. La app te preguntará por la noche.</p>
          </div>
        )}
      </section>

      <div className="stats">
        <div className="stat"><b>{fmt(m.earned)}</b><span>Puntos ganados</span></div>
        <div className="stat"><b>{m.streak.current}</b><span>Racha actual</span></div>
        <div className="stat"><b>{m.streak.best}</b><span>Mejor racha</span></div>
        <div className="stat"><b>{m.counts.done}</b><span>Tareas hechas</span></div>
      </div>

      <section className="card">
        <div className="spread wall-head">
          <h2 className="card-title">Muro de días</h2>
          <div className="segmented" role="group" aria-label="Qué mostrar en el muro">
            <button aria-pressed={!showRatings} onClick={() => setMode('tasks')}>Tareas</button>
            <button aria-pressed={showRatings} onClick={() => setMode('ratings')}>Notas</button>
          </div>
        </div>
        <p className="sub tight">
          {showRatings ? 'Cada casilla muestra la nota que le diste al día.' : `${m.counts.green} en verde, ${m.counts.red} en rojo`}
        </p>

        <div className={`wall-row${showRatings ? ' ratings' : ''}`}>
          <div className="wall-labels">{WEEK.map(d => <span key={d}>{DOW_SHORT[d]}</span>)}</div>
          <div className="wall-scroll" ref={scroller}>
            <div className="wall">
              {m.wall.map(c => {
                const rated = showRatings && c.rating !== null;
                const cls = [
                  'cell',
                  showRatings ? (rated ? 'rated' : c.status === 'future' ? 'future' : 'unrated') : c.status,
                  !showRatings && c.status === 'good' && c.earned >= 50 && 'hi',
                  c.date === selected && 'sel'
                ].filter(Boolean).join(' ');
                return (
                  <button
                    key={c.date}
                    className={cls}
                    style={rated ? scoreStyle(c.rating) : undefined}
                    title={cellLabel(c)}
                    aria-label={cellLabel(c)}
                    disabled={c.status === 'future'}
                    onClick={() => setSelected(s => (s === c.date ? null : c.date))}
                  >
                    {rated ? formatScore(c.rating) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {showRatings ? (
          <div className="legend">
            <span className="score-scale" aria-hidden="true" /><span>de 0 a 10</span>
            <span><i className="lg empty" />Sin nota</span>
          </div>
        ) : (
          <div className="legend">
            <span><i className="lg good" />Cumplido</span>
            <span><i className="lg partial" />A medias</span>
            <span><i className="lg bad" />No cumplido</span>
            <span><i className="lg wildcard" />Comodín</span>
            <span><i className="lg paused" />Pausa</span>
            <span><i className="lg empty" />Sin retos</span>
          </div>
        )}
        {selected && <div className="wall-detail"><DayDetail date={selected} version={version} open={open} /></div>}
      </section>

      <h2 className="sec">Medallas</h2>
      <div className="medals">
        {m.medals.map(md => (
          <div key={md.id} className={`medal${md.unlocked ? '' : ' locked'}`}>
            <span className="m" aria-hidden="true">{md.icon}</span>
            <div><b>{md.name}</b><span>{md.unlocked ? 'Conseguida' : md.desc}</span></div>
          </div>
        ))}
      </div>

      <h2 className="sec">Últimos días</h2>
      <div className="daylog">
        {m.recent.map(d => (
          <div key={d.date} className={`dl ${d.status}`}>
            <span className="d">{shortDate(d.date)}</span>
            <span className="its">
              {d.status === 'wildcard' ? '🃏' : d.status === 'paused' ? '🏖️' : d.items.map((it, k) => (
                <span key={k} title={it.name} className={it.status === 'done' ? '' : 'x'}>{it.icon}</span>
              ))}
            </span>
            {d.rating !== null && <span className="score-chip sm" style={scoreStyle(d.rating)}>{formatScore(d.rating)}</span>}
            <span className={`net${d.net > 0 ? ' pos' : d.net < 0 ? ' neg' : ''}`}>{d.net > 0 ? `+${d.net}` : d.net}</span>
          </div>
        ))}
        {!m.recent.length && <p className="sub">Cuando completes o falles tareas, aparecerán aquí.</p>}
      </div>
    </div>
  );
}
