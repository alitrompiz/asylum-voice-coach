import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    (mode === 'development' || process.env.ANALYZE) && componentTagger(),
    (mode === 'development' || process.env.ANALYZE) && visualizer({
      open: !!process.env.ANALYZE,
      gzipSize: true,
      brotliSize: true,
      filename: 'stats.html'
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: !!process.env.ANALYZE,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react') || id.includes('react-dom') || id.includes('/react-router-dom/')) return 'vendor-react';
          if (id.includes('@supabase/supabase-js')) return 'vendor-supabase';
          if (id.includes('recharts')) return 'vendor-charts';
          if (id.includes('i18next') || id.includes('react-i18next') || id.includes('i18next-browser-languagedetector')) return 'vendor-i18n';
          if (id.includes('@sentry') || id.includes('mixpanel-browser') || id.includes('@datadog')) return 'vendor-analytics';
          if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('cmdk')) return 'vendor-ui';
          return 'vendor';
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
}));
