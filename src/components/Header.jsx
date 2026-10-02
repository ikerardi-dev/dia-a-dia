import { useEffect, useRef, useState } from 'react';
import { fmt, longDate, todayStr } from '../lib/format.js';

export default function Header({ balance }) {
  const previous = useRef(balance);
  const [bump, setBump] = useState(null);

  // Animación "+10" / "−5" cuando cambia el saldo
  useEffect(() => {
    if (previous.current !== null && balance !== null && balance !== previous.current) {
      setBump({ value: balance - previous.current, key: Date.now() });
    }
    previous.current = balance;
  }, [balance]);

  return (
    <header className="top">
      <div className="brand">
        <img className="logo" src="./logo-256.png" alt="" width="44" height="44" />
        <div>
          <h1>Día a Día</h1>
          <p>{longDate(todayStr())}</p>
        </div>
      </div>
      <div className={`score${balance < 0 ? ' neg' : ''}`} aria-live="polite">
        <b>{balance === null ? '—' : fmt(balance)}</b>
        <small>puntos</small>
        {bump && (
          <span key={bump.key} className={`bump ${bump.value > 0 ? 'plus' : 'minus'}`}>
            {bump.value > 0 ? `+${bump.value}` : `−${-bump.value}`}
          </span>
        )}
      </div>
    </header>
  );
}
