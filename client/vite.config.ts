import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      // Import thẳng mã nguồn TS của shared → sửa shared là client hot-reload ngay.
      '@shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },
  build: {
    // three.js chiếm phần lớn bundle (~130 KB gzip) — chấp nhận được, khỏi cảnh báo.
    chunkSizeWarningLimit: 800,
  },
  server: {
    fs: { allow: ['..'] },
  },
});
