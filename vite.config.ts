import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  base: './', // Electron için relative path
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          xlsx: ['xlsx'],
          tree: ['react-d3-tree']
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Chunk boyut uyarısını artır
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});