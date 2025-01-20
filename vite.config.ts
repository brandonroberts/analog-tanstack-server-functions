/// <reference types="vitest" />

import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import { createTanStackServerFnPlugin } from '@tanstack/server-functions-plugin';
import { TanStackStartVitePlugin } from '@tanstack/start-plugin';
import { resolve } from 'node:path';

const TanStackServerFnsPlugin = createTanStackServerFnPlugin({
  // This is the ID that will be available to look up and import
  // our server function manifest and resolve its module
  manifestVirtualImportId: 'tsr:server-fn-manifest',
  client: {
    getRuntimeCode: () =>
      `import { createClientRpc } from '@tanstack/start/client-runtime'`,
    replacer: (opts) => `createClientRpc(${JSON.stringify(opts.functionId)})`,
  },
  ssr: {
    getRuntimeCode: () =>
      `import { createSsrRpc } from '@tanstack/start/ssr-runtime'`,
    replacer: (opts) => `createSsrRpc(${JSON.stringify(opts.functionId)})`,
  },
  server: {
    getRuntimeCode: () =>
      `import { createServerRpc } from '@tanstack/start/server-runtime'`,
    replacer: (opts) =>
      `createServerRpc(${JSON.stringify(opts.functionId)}, ${opts.fn})`,
  },
})

// https://vitejs.dev/config/
export default defineConfig(({ mode, isSsrBuild }) => ({
  build: {
    target: ['es2020'],
    outDir: 'dist/client'
  },
  resolve: {
    mainFields: ['module'],
    alias: {
      '~': resolve(__dirname, 'src')
    }
  },
  plugins: [
    analog({
      ssr: false,
      nitro: {
        rollupConfig: {
          plugins: [
            TanStackStartVitePlugin({ env: 'server' }),
            TanStackServerFnsPlugin.server,
            {
              name: 'tsr:resolve',
              resolveId(id) {
                const [fileId, query] = id.split('?');

                if (query && query.includes('tsr-directive')) {
                  return fileId;
                }

                return;
              }
            }
          ],
        },
      }
    }),
    { ...TanStackStartVitePlugin({ env: 'client' }), enforce: 'post' },
    { ...TanStackServerFnsPlugin.client[0], enforce: 'post' },
    TanStackServerFnsPlugin.client[1]
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['**/*.spec.ts'],
    reporters: ['default'],
  },
  define: {
    'import.meta.vitest': mode !== 'production',
    'process.env.TSS_SERVER_FN_BASE': `"api/server-fns"`
  },
}));
