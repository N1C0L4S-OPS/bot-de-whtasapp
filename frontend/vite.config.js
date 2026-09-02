import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: true,
    proxy: {
      // API propia del bot (conversaciones, stats, config de canales)
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      // Login/perfil viven en el sistema principal, no acá — el bot no tiene su propio login.
      '/main-api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/main-api/, '/api')
      }
    }
  }
});
