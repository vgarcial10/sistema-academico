import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// host: true permite acceder al dev server desde otras maquinas de la red
// (util cuando el proyecto corre en el Ubuntu Desktop y se prueba desde otro equipo).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
