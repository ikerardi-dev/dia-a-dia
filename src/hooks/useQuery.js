import { useEffect, useState } from 'react';

/**
 * Carga datos del backend y los vuelve a pedir cuando cambian las dependencias.
 * Mantiene los datos anteriores mientras llegan los nuevos (sin parpadeos).
 */
export function useQuery(loader, deps) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    loader()
      .then(result => { if (alive) { setData(result); setError(null); } })
      .catch(err => { if (alive) setError(err); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error };
}
