import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Rutas relativas para que funcione dentro del APK
  base: './',
  optimizeDeps: { exclude: ['sql.js'] }
});
