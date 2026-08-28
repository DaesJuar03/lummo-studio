import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import JavaScriptObfuscator from 'javascript-obfuscator';

function lummoObfuscator() {
  return {
    name: 'lummo-code-obfuscator',
    apply: 'build', // Solo se aplica en 'vite build' de producción, nunca en desarrollo
    enforce: 'post',
    renderChunk(code, chunk) {
      if (!chunk.fileName.endsWith('.js')) return null;
      const obfuscated = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.6,
        deadCodeInjection: false, // mantener rendimiento óptimo
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        transformObjectKeys: false, // evitar romper props dinámicas de React
        disableConsoleOutput: true,
        selfDefending: false,
        sourceMap: false
      });
      return {
        code: obfuscated.getObfuscatedCode(),
        map: null
      };
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), lummoObfuscator()],
  base: './',
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: [
        '**/lummo_databases.json',
        '**/lummo_projects.json',
        '**/lummo_local.db*',
        '**/release/**',
        '**/dist/**',
        '**/.git/**'
      ]
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{js,jsx,ts,tsx}']
  }
});
