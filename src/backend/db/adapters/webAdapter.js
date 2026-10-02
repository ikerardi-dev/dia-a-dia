import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { createSqlJsAdapter } from './sqljsAdapter.js';

const STORAGE_KEY = 'diaadia-sqlite';

/** Solo para desarrollar en el navegador: guarda la base de datos en localStorage */
export async function createWebAdapter() {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });

  let data = null;
  try {
    const b64 = localStorage.getItem(STORAGE_KEY);
    if (b64) data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  } catch { /* base de datos nueva */ }

  let timer = null;
  const persist = db => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const bytes = db.export();
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      localStorage.setItem(STORAGE_KEY, btoa(binary));
    }, 300);
  };

  return createSqlJsAdapter(SQL, { data, onChange: persist });
}
