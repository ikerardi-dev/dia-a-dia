import { api } from '../backend/api.js';
import { useQuery } from '../hooks/useQuery.js';
import { fmt, shortDate } from '../lib/format.js';
import EmptyState from '../components/EmptyState.jsx';

export default function RewardsView({ version, act, open }) {
  const { data } = useQuery(() => Promise.all([api.rewards(), api.balance(), api.redemptions(15)]), [version]);
  if (!data) return <p className="loading">Cargando…</p>;
  const [rewards, balance, history] = data;

  const askRedeem = r => open.confirm({
    title: `¿Canjear "${r.name}"?`,
    text: `Se restarán ${fmt(r.cost)} puntos. Te quedarán ${fmt(balance - r.cost)}.`,
    confirmLabel: `Canjear por ${fmt(r.cost)}`,
    onConfirm: () => act(() => api.redeemReward(r.id), `${r.icon} ¡Disfrútalo, te lo has ganado!`)
  });

  return (
    <div className="stack">
      <section className="card wallet">
        <span className="sub">Puedes gastar</span>
        <b className={balance < 0 ? 'neg' : ''}>{fmt(balance)} puntos</b>
      </section>

      <div className="spread">
        <h2 className="title">Recompensas</h2>
        <button className="btn primary" onClick={() => open.reward(null)}>＋ Nueva</button>
      </div>

      {!rewards.length ? (
        <EmptyState icon="🎁" title="Ponle premio a tu esfuerzo." text="Crea caprichos con un precio en puntos y canjéalos cuando te los ganes.">
          <button className="btn primary" onClick={() => open.reward(null)}>Crear recompensa</button>
          <button className="btn" onClick={() => act(api.loadExampleRewards, 'Recompensas de ejemplo cargadas.')}>Cargar ejemplos</button>
        </EmptyState>
      ) : (
        <div className="rewards">
          {rewards.map(r => {
            const pct = Math.max(0, Math.min(100, Math.round((balance / r.cost) * 100)));
            return (
              <div key={r.id} className={`reward${r.canAfford ? ' ready' : ''}`}>
                <div className="reward-top">
                  <span className="reward-icon" aria-hidden="true">{r.icon}</span>
                  <div className="body">
                    <div className="name">{r.name}</div>
                    <div className="meta">{fmt(r.cost)} puntos</div>
                  </div>
                  <button className="btn ghost sm" onClick={() => open.reward(r)}>Editar</button>
                </div>
                <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                {r.canAfford
                  ? <button className="btn good" onClick={() => askRedeem(r)}>Canjear</button>
                  : <span className="sub">Te faltan {fmt(r.missing)} puntos</span>}
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <>
          <h2 className="sec">Canjeado</h2>
          <div className="daylog">
            {history.map(h => (
              <div key={h.id} className="dl">
                <span className="d">{shortDate(h.date)}</span>
                <span className="its">{h.icon} {h.name}</span>
                <span className="net neg">−{fmt(h.cost)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
