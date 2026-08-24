import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  define: (() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const label = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    return {
      __BUILD_ID__: JSON.stringify(now.toISOString().replace(/[T:]/g, '-').slice(0, 19)),
      __BUILD_LABEL__: JSON.stringify(label),
    };
  })(),
});
