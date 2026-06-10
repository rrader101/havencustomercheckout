import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts:true,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy third-party libraries into separate, independently
        // cacheable chunks. They download in parallel with the app code and
        // stay cached across deploys (a CSS/app tweak no longer busts Stripe,
        // PostHog, React, etc.). Path-based matching is used because the
        // previous object form (e.g. `vendor: ['react', 'react-dom']`) was
        // not actually extracting React — it stayed in the main chunk.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@stripe')) return 'stripe';
          if (id.includes('posthog-js')) return 'analytics';
          if (id.includes('@googlemaps')) return 'maps';
          if (
            id.includes('react-hook-form') ||
            id.includes('@hookform') ||
            /[\\/]zod[\\/]/.test(id)
          )
            return 'forms';
          if (id.includes('@radix-ui')) return 'radix';
          if (id.includes('react-router') || id.includes('@remix-run')) return 'router';
          if (id.includes('lucide-react')) return 'icons';
          // React, react-dom, scheduler and the remaining small libs share one
          // `vendor` chunk. Keeping React together with the rest avoids a
          // circular chunk graph (vendor <-> react-vendor) that can break
          // module init order at runtime.
          return 'vendor';
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
  },
  css: {
    devSourcemap: mode === 'development',
  },
}));
