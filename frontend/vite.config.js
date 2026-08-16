import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(root, 'src') },
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT || 5000),
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_URL || 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT || 5000),
    allowedHosts: true,
  },
});