import { shortDate } from '../lib/format.js';

/** Resumen de lo que se quedó sin hacer en días anteriores */
export default function NoticeCard({ notice, onDismiss }) {
  const lost = notice.items.reduce((a, i) => a + i.lost, 0);
  return (
    <div className="notice">
      <div className="face" aria-hidden="true">😞</div>
      <div className="notice-body">
        <b>Se quedaron sin hacer: −{lost} puntos</b>
        <ul>
          {notice.items.map((m, k) => (
            <li key={k}>
              {m.icon} {m.name} (−{m.lost}){m.movedTo ? `, movida al ${shortDate(m.movedTo)}` : ''}
            </li>
          ))}
        </ul>
      </div>
      <button className="btn ghost sm" onClick={onDismiss}>Entendido</button>
    </div>
  );
}
