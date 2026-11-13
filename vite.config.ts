import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 번들러 설정 (Electron 파일 프로토콜 호환을 위해 base를 './'로 지정)
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
