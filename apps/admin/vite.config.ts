import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const apiTarget = process.env['VITE_API_PROXY_TARGET'] ?? 'http://api:3000';

export default defineConfig({
  plugins: [
    vue(),
    // Engine preview players are React islands; React only compiles engine sources.
    react({ include: /packages\/engines\/.*\.tsx$/ }),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    // One copy of React/Remotion even though they are resolved from the engine package.
    dedupe: ['react', 'react-dom', 'remotion', '@remotion/player'],
    // Consume workspace packages from their TypeScript sources.
    conditions: ['@vgen/source', 'module', 'browser', 'development|production'],
  },
  build: {
    // The engine player island (React + Remotion Player) is one lazily loaded ~1.1 MB chunk.
    chunkSizeWarningLimit: 1200,
  },
  server: {
    // `admin` is the service name inside the docker network (used by headless smoke checks);
    // `.local` names (Bonjour, e.g. `MacBook.local`) open the admin from phones on the same
    // network. IP addresses are always allowed.
    allowedHosts: ['localhost', 'admin', '.local'],
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
});
