import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            (res as import('http').ServerResponse).writeHead(503);
            (res as import('http').ServerResponse).end('Server not ready yet — please refresh');
          });
        },
      },
    },
  },
});
