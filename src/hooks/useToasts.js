import { useCallback, useState } from 'react';

let nextId = 1;

export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, ms = 3800) => {
    const id = nextId++;
    setToasts(list => [...list, { id, message }]);
    setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), ms);
  }, []);

  return [toasts, push];
}
