import { useEffect, useRef, useState } from 'react';
import { api } from '../backend/api.js';
import { useQuery } from '../hooks/useQuery.js';
import { fmt, longDate, shortDate, WEEK, DOW_SHORT } from '../lib/format.js';
import DayDetail from '../components/DayDetail.jsx';

const STATUS_TEXT = {
  good: 'cumplido', partial: 'a medias', bad: 'no cumplido', wildcard: 'comodín',
  progress: 'en curso', future: 'por llegar', empty: 'sin retos'
};

export default function MeritsView({ version }) {
  const [selected, setSelected] = useState(null);
  const scroller = useRef(null);
  const { data: m } = useQuery(() => api.merits(), [version]);

  // La semana actual está a la derecha: el muro empieza desplazado hasta ella
  const loaded = !!m;
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [loaded]);

  if (!m) return <p className="loading">Cargando…</p>;

  return (
    <div className="stack">
      <div className="stats">
        <div className="stat"><b>{fmt(m.earned)}</b><span>Puntos ganados</span></div>
        <div className="stat"><b>{m.streak.current}</b><span>Racha actual</span></div>
        <div className="stat"><b>{m.streak.best}</b><span>Mejor racha</span></div>
        <div className="stat"><b>{m.counts.done}</b><span>Tareas hechas</span></div>
      </div>

      <section className="card">
        <div className="spread wall-head">
          <h2 className="card-title">Muro de días</h2>
          <span className="sub">{m.counts.green} en verde, {m.counts.red} en rojo</span>
        </div>
        <div className="wall-row">
          <div className="wall-labels">{WEEK.map(d => <span key={d}>{DOW_SHORT[d]}</span>)}</div>
          <div className="wall-scroll" ref={scroller}>
            <div className="wall">
              {m.wall.map(c => {
                const label = `${longDate(c.date)}: ${STATUS_TEXT[c.status]}${c.earned || c.lost ? `, +${c.earned} −${c.lost}` : ''}`;
                const cls = ['cell', c.status, c.status === 'good' && c.earned >= 50 && 'hi', c.date === selected && 'sel'].filter(Boolean).join(' ');
                return (
                  <button key={c.date} className={cls} title={label} aria-label={label}
                    disabled={c.status === 'future'}
                    onClick={() => setSelected(s => (s === c.date ? null : c.date))} />
                );
              })}
            </div>
          </div>
        </div>
        <div className="legend">
          <span><i className="lg good" />Cumplido</span>
          <span><i className="lg partial" />A medias</span>
          <span><i className="lg bad" />No cumplido</span>
          <span><i className="lg wildcard" />Comodín</span>
          <span><i className="lg empty" />Sin retos</span>
        </div>
        {selected && <div className="wall-detail"><DayDetail date={selected} version={version} /></div>}
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
              {d.status === 'wildcard' ? '🃏' : d.items.map((it, k) => (
                <span key={k} title={it.name} className={it.status === 'done' ? '' : 'x'}>{it.icon}</span>
              ))}
            </span>
            <span className={`net${d.net > 0 ? ' pos' : d.net < 0 ? ' neg' : ''}`}>{d.net > 0 ? `+${d.net}` : d.net}</span>
          </div>
        ))}
        {!m.recent.length && <p className="sub">Cuando completes o falles tareas, aparecerán aquí.</p>}
      </div>
    </div>
  );
}
