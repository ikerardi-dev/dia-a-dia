import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Rutas relativas para que funcione dentro del APK
  base: './',
  optimizeDeps: { exclude: ['sql.js'] },
  define: {
    // La versión de package.json se muestra en Ajustes
    __APP_VERSION__: JSON.stringify(pkg.version),
    // En el APK (modo "android") no se incluye la base de datos del navegador (sql.js)
    __WEB_DB__: JSON.stringify(mode !== 'android')
  }
}));
