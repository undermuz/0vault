/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { reactAriaResolvePlugin } from '../../vite.react-aria-resolve.mts';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/electrobun-desktop',
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: true,
  },
  preview: {
    port: 5173,
    host: '127.0.0.1',
  },
  optimizeDeps: {
    include: ['use-sync-external-store/shim'],
  },
  plugins: [reactAriaResolvePlugin(), react(), tailwindcss(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  // Uncomment this if you are using workers.
  // worker: {
  //   plugins: () => [ nxViteTsPaths() ],
  // },
  build: {
    outDir: '../../dist/apps/electrobun-desktop',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
