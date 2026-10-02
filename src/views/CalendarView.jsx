import { useState } from 'react';
import { api } from '../backend/api.js';
import { useQuery } from '../hooks/useQuery.js';
import { MONTHS, WEEK, DOW_SHORT, longDate, todayStr } from '../lib/format.js';
import { parseYmd } from '../backend/utils/dates.js';
import DayDetail from '../components/DayDetail.jsx';

const MAX_ICONS = 5;

export default function CalendarView({ version, open }) {
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(todayStr());
  const { data } = useQuery(() => api.month(month.y, month.m), [version, month.y, month.m]);

  const shift = delta => setMonth(({ y, m }) => {
    const d = new Date(y, m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  return (
    <div className="stack">
      <section className="card">
        <div className="cal-head">
          <button className="icon-btn" aria-label="Mes anterior" onClick={() => shift(-1)}>‹</button>
          <h2>{MONTHS[month.m]} {month.y}</h2>
          <button className="icon-btn" aria-label="Mes siguiente" onClick={() => shift(1)}>›</button>
        </div>

        <div className="cal">
          {WEEK.map(d => <div key={d} className="dow">{DOW_SHORT[d]}</div>)}
          {data?.cells.map(cell => {
            const cls = ['day', cell.status, !cell.inMonth && 'out', cell.isToday && 'today', cell.date === selected && 'sel']
              .filter(Boolean).join(' ');
            return (
              <button key={cell.date} className={cls} aria-label={longDate(cell.date)} onClick={() => setSelected(cell.date)}>
                <span className="n">{parseYmd(cell.date).getDate()}</span>
                <span className="icons">
                  {cell.status === 'wildcard'
                    ? <span>🃏</span>
                    : cell.items.slice(0, MAX_ICONS).map((it, k) => (
                        <span key={k} className={it.status === 'missed' ? 'x' : ''}>{it.icon}</span>
                      ))}
                  {cell.status !== 'wildcard' && cell.items.length > MAX_ICONS && <span className="more">+{cell.items.length - MAX_ICONS}</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="legend">
          <span><i className="lg good" />Cumplido</span>
          <span><i className="lg partial" />A medias</span>
          <span><i className="lg bad" />No cumplido</span>
          <span><i className="lg wildcard" />Comodín</span>
        </div>
      </section>

      <section className="card">
        <DayDetail date={selected} version={version} open={open} />
      </section>
    </div>
  );
}
