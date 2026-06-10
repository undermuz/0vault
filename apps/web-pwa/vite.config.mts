/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { reactAriaResolvePlugin } from '../../vite.react-aria-resolve.mts';

const ghPagesBase = '/0vault/';

export default defineConfig(() => ({
  base: process.env.GH_PAGES === 'true' ? ghPagesBase : '/',
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/web-pwa',
  server: {
    port: 5174,
    host: '127.0.0.1',
    strictPort: true,
  },
  preview: {
    port: 5174,
    host: '127.0.0.1',
  },
  optimizeDeps: {
    include: ['use-sync-external-store/shim'],
  },
  plugins: [
    reactAriaResolvePlugin(),
    react(),
    tailwindcss(),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: '0vault',
        short_name: '0vault',
        description:
          'Encrypted .age vault editor with archive support',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: './',
        icons: [
          {
            src: 'favicon.ico',
            sizes: '64x64',
            type: 'image/x-icon',
          },
        ],
      },
    }),
  ],
  build: {
    outDir: '../../dist/apps/web-pwa',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
