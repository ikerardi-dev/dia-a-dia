import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [react()],
  // Rutas relativas para que funcione dentro del APK
  base: './',
  optimizeDeps: { exclude: ['sql.js'] },
  // La versión de package.json se muestra en Ajustes
  define: { __APP_VERSION__: JSON.stringify(pkg.version) }
});
